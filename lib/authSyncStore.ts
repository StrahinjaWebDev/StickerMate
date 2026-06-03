"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import {
  getCloudSyncFailureKind,
  getLocalSnapshot,
  hasMeaningfulLocalData,
  isInvalidRefreshTokenError,
  loadCloudCollection,
  mergeLocalAndCloud,
  saveCloudCollection,
  saveLocalSnapshot,
  syncNow as syncCloudNow,
  type CloudSnapshot,
  type CloudSyncStatus
} from "@/lib/cloudSync";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { createClient } from "@/utils/supabase/client";

type MergePrompt = {
  cloud: CloudSnapshot | null;
  reason: "cloud-empty" | "both-have-data";
};

type AuthSyncState = {
  user: User | null;
  authReady: boolean;
  authMessageKey: string | null;
  status: CloudSyncStatus;
  messageKey: string | null;
  lastSyncedAt: string | null;
  mergePrompt: MergePrompt | null;
};

const initialState: AuthSyncState = {
  user: null,
  authReady: false,
  authMessageKey: null,
  status: "idle",
  messageKey: null,
  lastSyncedAt: null,
  mergePrompt: null
};

export const useAuthSyncStore = create<AuthSyncState>()(() => initialState);

let initialized = false;
let authSubscription: { unsubscribe: () => void } | null = null;
let collectionUnsubscribe: (() => void) | null = null;
let syncPromise: Promise<CloudSnapshot | null> | null = null;
let autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
let suppressAutoSync = false;
let authExpiredHandling = false;
let signOutInFlight = false;
let preparedUserId: string | null = null;

function getSupabase() {
  return createClient();
}

function setAuthSyncState(partial: Partial<AuthSyncState>) {
  useAuthSyncStore.setState(partial);
}

function clearAutoSyncTimer() {
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = null;
}

function muteNextLocalStoreSync() {
  suppressAutoSync = true;
  window.setTimeout(() => {
    suppressAutoSync = false;
  }, 1200);
}

function setSyncFailure(error: unknown) {
  if (isInvalidRefreshTokenError(error)) {
    void handleAuthExpired();
    return;
  }

  const failureKind = getCloudSyncFailureKind(error);
  setAuthSyncState({
    status: failureKind === "missing_tables" ? "disabled_missing_tables" : "failed",
    messageKey: failureKind === "missing_tables" ? "account.cloudNotReady" : "account.syncWarning"
  });
}

async function runExclusive(task: () => Promise<CloudSnapshot | null>) {
  if (syncPromise) return syncPromise;

  syncPromise = task().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

async function handleAuthExpired() {
  if (authExpiredHandling) return;
  authExpiredHandling = true;
  clearAutoSyncTimer();
  preparedUserId = null;

  setAuthSyncState({
    user: null,
    authReady: true,
    authMessageKey: "account.sessionExpired",
    status: "auth_expired",
    messageKey: "account.sessionExpired",
    mergePrompt: null,
    lastSyncedAt: null
  });

  const supabase = getSupabase();
  try {
    await supabase?.auth.signOut({ scope: "local" });
  } catch {
    // Broken refresh tokens can make remote sign-out fail; local auth state is already cleared.
  } finally {
    window.setTimeout(() => {
      authExpiredHandling = false;
    }, 1000);
  }
}

async function prepareCloudState(currentUser: User, force = false) {
  if (!force && preparedUserId === currentUser.id) return null;

  const supabase = getSupabase();
  if (!supabase) {
    setAuthSyncState({ status: "failed", messageKey: "account.notConfigured" });
    return null;
  }

  return runExclusive(async () => {
    preparedUserId = currentUser.id;
    setAuthSyncState({ status: "syncing", messageKey: null });

    try {
      const local = getLocalSnapshot();
      const cloud = await loadCloudCollection(supabase, currentUser.id);
      const localHasData = hasMeaningfulLocalData(local);
      const cloudHasData = cloud ? hasMeaningfulLocalData(cloud) : false;

      if (!cloud && localHasData) {
        setAuthSyncState({ mergePrompt: { cloud: null, reason: "cloud-empty" }, status: "idle", messageKey: null });
        return null;
      }

      if (cloud && localHasData && cloudHasData) {
        setAuthSyncState({ mergePrompt: { cloud, reason: "both-have-data" }, status: "idle", messageKey: null });
        return cloud;
      }

      if (cloud && cloudHasData && !localHasData) {
        muteNextLocalStoreSync();
        saveLocalSnapshot(cloud);
        setAuthSyncState({ lastSyncedAt: cloud.updatedAt, status: "synced", messageKey: null });
        return cloud;
      }

      if (!cloud && !localHasData) {
        await saveCloudCollection(supabase, currentUser, local);
        setAuthSyncState({ lastSyncedAt: local.updatedAt, status: "synced", messageKey: null });
        return local;
      }

      setAuthSyncState({ status: "synced", messageKey: null });
      return cloud;
    } catch (error) {
      preparedUserId = null;
      setSyncFailure(error);
      return null;
    }
  });
}

async function runAutoSync() {
  const { user, mergePrompt, status } = useAuthSyncStore.getState();
  const supabase = getSupabase();

  if (!supabase || !user || mergePrompt || syncPromise || status === "syncing" || status === "auth_expired" || status === "disabled_missing_tables") {
    return null;
  }

  return runExclusive(async () => {
    setAuthSyncState({ status: "syncing", messageKey: null });
    try {
      const snapshot = getLocalSnapshot();
      await saveCloudCollection(supabase, user, snapshot);
      setAuthSyncState({ status: "synced", messageKey: null, lastSyncedAt: new Date().toISOString() });
      return snapshot;
    } catch (error) {
      setSyncFailure(error);
      return null;
    }
  });
}

function ensureCollectionSubscription() {
  if (collectionUnsubscribe) return;

  collectionUnsubscribe = useCollectionStore.subscribe(() => {
    const { user, mergePrompt, status } = useAuthSyncStore.getState();

    if (!user || mergePrompt || suppressAutoSync || syncPromise || status === "auth_expired" || status === "disabled_missing_tables" || status === "failed") {
      return;
    }

    setAuthSyncState({ status: "dirty" });
    clearAutoSyncTimer();
    autoSyncTimer = setTimeout(() => {
      void runAutoSync();
    }, 2500);
  });
}

export function initializeAuthSync() {
  if (initialized) return;
  initialized = true;

  const supabase = getSupabase();
  if (!supabase) {
    setAuthSyncState({ authReady: true, status: "idle" });
    return;
  }

  ensureCollectionSubscription();

  void (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const user = data.session?.user ?? null;
      setAuthSyncState({ user, authReady: true, authMessageKey: null, status: user ? "idle" : "idle" });
      if (user) void prepareCloudState(user);
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await handleAuthExpired();
      } else {
        setAuthSyncState({ user: null, authReady: true, status: "failed", messageKey: "account.syncWarning" });
      }
    }
  })();

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const nextUser = session?.user ?? null;
    const previousUser = useAuthSyncStore.getState().user;

    if (event === "SIGNED_OUT") {
      clearAutoSyncTimer();
      preparedUserId = null;
      setAuthSyncState({ user: null, status: "idle", messageKey: null, mergePrompt: null, lastSyncedAt: null, authReady: true });
      return;
    }

    setAuthSyncState({ user: nextUser, authReady: true, authMessageKey: null });

    if (nextUser && previousUser?.id !== nextUser.id) {
      preparedUserId = null;
      window.setTimeout(() => {
        void prepareCloudState(nextUser);
      }, 0);
    }
  });

  authSubscription = data.subscription;
}

export async function signInWithGoogle() {
  const supabase = getSupabase();
  if (!supabase) {
    setAuthSyncState({ status: "failed", messageKey: "account.notConfigured" });
    return;
  }

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
}

export async function signOutLocally() {
  if (signOutInFlight) return;
  signOutInFlight = true;
  clearAutoSyncTimer();
  preparedUserId = null;

  const supabase = getSupabase();
  try {
    await supabase?.auth.signOut({ scope: "local" });
  } catch {
    setAuthSyncState({ user: null, status: "idle", messageKey: null, mergePrompt: null, lastSyncedAt: null });
  } finally {
    setAuthSyncState({ user: null, status: "idle", messageKey: null, mergePrompt: null, lastSyncedAt: null });
    signOutInFlight = false;
  }
}

export async function runManualSync() {
  const { user } = useAuthSyncStore.getState();
  const supabase = getSupabase();
  if (!supabase || !user) return null;

  return runExclusive(async () => {
    setAuthSyncState({ status: "syncing", messageKey: null });
    try {
      const snapshot = await syncCloudNow(supabase, user);
      setAuthSyncState({ status: "synced", messageKey: "account.syncSuccess", lastSyncedAt: snapshot.updatedAt, mergePrompt: null });
      return snapshot;
    } catch (error) {
      setSyncFailure(error);
      return null;
    }
  });
}

export async function resolveCloudMerge(action: "local" | "cloud" | "merge") {
  const { user, mergePrompt } = useAuthSyncStore.getState();
  const supabase = getSupabase();
  if (!supabase || !user || !mergePrompt) return null;

  return runExclusive(async () => {
    setAuthSyncState({ status: "syncing", messageKey: null });

    try {
      const local = getLocalSnapshot();
      const nextSnapshot =
        action === "cloud" && mergePrompt.cloud
          ? mergePrompt.cloud
          : action === "merge" && mergePrompt.cloud
            ? mergeLocalAndCloud(local, mergePrompt.cloud)
            : local;

      muteNextLocalStoreSync();
      saveLocalSnapshot(nextSnapshot);
      await saveCloudCollection(supabase, user, nextSnapshot);
      setAuthSyncState({
        mergePrompt: null,
        lastSyncedAt: new Date().toISOString(),
        status: "synced",
        messageKey: "account.syncSuccess"
      });
      return nextSnapshot;
    } catch (error) {
      setSyncFailure(error);
      return null;
    }
  });
}

export function cleanupAuthSyncForTests() {
  authSubscription?.unsubscribe();
  authSubscription = null;
  collectionUnsubscribe?.();
  collectionUnsubscribe = null;
  clearAutoSyncTimer();
  initialized = false;
  syncPromise = null;
}
