"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import {
  getCloudSyncFailureKind,
  getLocalSnapshot,
  getLocalSyncFingerprint,
  hasMeaningfulCloudData,
  hasMeaningfulLocalData,
  isInvalidRefreshTokenError,
  loadCloudCollection,
  mergeLocalAndCloud,
  saveCloudCollection,
  saveLocalSnapshot,
  snapshotsAreEquivalent,
  syncNow as syncCloudNow,
  type CloudSnapshot,
  type CloudSyncStatus
} from "@/lib/cloudSync";
import { useCollectionStore, waitForCollectionHydration } from "@/stores/useCollectionStore";
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
  initialLoadDone: boolean;
};

const initialState: AuthSyncState = {
  user: null,
  authReady: false,
  authMessageKey: null,
  status: "idle",
  messageKey: null,
  lastSyncedAt: null,
  mergePrompt: null,
  initialLoadDone: false
};

export const useAuthSyncStore = create<AuthSyncState>()(() => initialState);

const SYNC_META_KEY = "stickermate-sync-meta";
const AUTO_SYNC_DELAY_MS = 2500;

let initialized = false;
let authSubscription: { unsubscribe: () => void } | null = null;
let collectionUnsubscribe: (() => void) | null = null;
let syncPromise: Promise<CloudSnapshot | null> | null = null;
let autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
let suppressAutoSync = false;
let authExpiredHandling = false;
let signOutInFlight = false;
let preparedUserId: string | null = null;
let prepareCompleted = false;
let sessionLocalEdited = false;
let pendingAutoSyncAfterCurrent = false;

type SyncMeta = {
  cloudUpdatedAt: string | null;
};

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

function scheduleAutoSync() {
  clearAutoSyncTimer();
  autoSyncTimer = setTimeout(() => {
    void runAutoSync();
  }, AUTO_SYNC_DELAY_MS);
}

function muteNextLocalStoreSync() {
  suppressAutoSync = true;
  window.setTimeout(() => {
    suppressAutoSync = false;
  }, 1200);
}

function readSyncMeta(userId: string): SyncMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, SyncMeta>;
    return all[userId] ?? null;
  } catch {
    return null;
  }
}

function writeSyncMeta(userId: string, cloudUpdatedAt: string | null) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SYNC_META_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, SyncMeta>) : {};
    all[userId] = { cloudUpdatedAt };
    window.localStorage.setItem(SYNC_META_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage failures; sync still works without meta.
  }
}

function markSynced(userId: string, cloudUpdatedAt: string, extra: Partial<AuthSyncState> = {}) {
  writeSyncMeta(userId, cloudUpdatedAt);
  setAuthSyncState({
    lastSyncedAt: cloudUpdatedAt,
    status: "synced",
    messageKey: null,
    mergePrompt: null,
    initialLoadDone: true,
    ...extra
  });
}

function setSyncFailure(error: unknown) {
  if (isInvalidRefreshTokenError(error)) {
    void handleAuthExpired();
    return;
  }

  const failureKind = getCloudSyncFailureKind(error);
  setAuthSyncState({
    status: failureKind === "missing_tables" ? "disabled_missing_tables" : "failed",
    messageKey: failureKind === "missing_tables" ? "account.cloudNotReady" : "account.syncWarning",
    initialLoadDone: true
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
  prepareCompleted = false;
  sessionLocalEdited = false;
  pendingAutoSyncAfterCurrent = false;

  setAuthSyncState({
    user: null,
    authReady: true,
    authMessageKey: "account.sessionExpired",
    status: "auth_expired",
    messageKey: "account.sessionExpired",
    mergePrompt: null,
    lastSyncedAt: null,
    initialLoadDone: false
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

async function applyCloudSnapshot(userId: string, cloud: CloudSnapshot) {
  muteNextLocalStoreSync();
  saveLocalSnapshot(cloud);
  markSynced(userId, cloud.updatedAt);
  sessionLocalEdited = false;
}

async function prepareCloudState(currentUser: User, force = false) {
  if (!force && preparedUserId === currentUser.id) return syncPromise ?? null;

  const supabase = getSupabase();
  if (!supabase) {
    setAuthSyncState({ status: "failed", messageKey: "account.notConfigured", initialLoadDone: true });
    return null;
  }

  return runExclusive(async () => {
    preparedUserId = currentUser.id;
    sessionLocalEdited = false;
    prepareCompleted = false;
    setAuthSyncState({ status: "syncing", messageKey: "account.loadingOnline", mergePrompt: null });

    try {
      const local = getLocalSnapshot();
      const cloud = await loadCloudCollection(supabase, currentUser.id);
      const localHasData = hasMeaningfulLocalData(local);
      const cloudHasData = cloud ? hasMeaningfulCloudData(cloud) : false;

      if (!cloudHasData && localHasData) {
        setAuthSyncState({
          mergePrompt: { cloud: null, reason: "cloud-empty" },
          status: "idle",
          messageKey: null,
          initialLoadDone: true
        });
        prepareCompleted = true;
        return null;
      }

      if (cloudHasData && !localHasData && cloud) {
        await applyCloudSnapshot(currentUser.id, cloud);
        prepareCompleted = true;
        return cloud;
      }

      if (!cloudHasData && !localHasData) {
        const cloudUpdatedAt = await saveCloudCollection(supabase, currentUser, local);
        markSynced(currentUser.id, cloudUpdatedAt);
        prepareCompleted = true;
        return local;
      }

      if (cloudHasData && localHasData && cloud) {
        if (snapshotsAreEquivalent(local, cloud)) {
          markSynced(currentUser.id, cloud.updatedAt);
          prepareCompleted = true;
          return cloud;
        }

        const meta = readSyncMeta(currentUser.id);
        const cloudChangedRemotely = Boolean(meta?.cloudUpdatedAt && meta.cloudUpdatedAt !== cloud.updatedAt);

        if (!sessionLocalEdited && cloudChangedRemotely) {
          await applyCloudSnapshot(currentUser.id, cloud);
          prepareCompleted = true;
          return cloud;
        }

        setAuthSyncState({
          mergePrompt: { cloud, reason: "both-have-data" },
          status: "idle",
          messageKey: null,
          initialLoadDone: true
        });
        prepareCompleted = true;
        return cloud;
      }

      markSynced(currentUser.id, cloud?.updatedAt ?? local.updatedAt);
      prepareCompleted = true;
      return cloud;
    } catch (error) {
      preparedUserId = null;
      prepareCompleted = true;
      setSyncFailure(error);
      return null;
    }
  });
}

async function runAutoSync() {
  const { user, mergePrompt, status } = useAuthSyncStore.getState();
  const supabase = getSupabase();

  if (
    !supabase ||
    !user ||
    mergePrompt ||
    status === "syncing" ||
    status === "auth_expired" ||
    status === "disabled_missing_tables"
  ) {
    return null;
  }

  if (syncPromise) {
    pendingAutoSyncAfterCurrent = true;
    setAuthSyncState({ status: "dirty" });
    return syncPromise;
  }

  return runExclusive(async () => {
    setAuthSyncState({ status: "syncing", messageKey: null });
    try {
      const snapshot = getLocalSnapshot();
      const cloudUpdatedAt = await saveCloudCollection(supabase, user, snapshot);
      markSynced(user.id, cloudUpdatedAt);
      return snapshot;
    } catch (error) {
      setSyncFailure(error);
      return null;
    } finally {
      if (pendingAutoSyncAfterCurrent) {
        pendingAutoSyncAfterCurrent = false;
        const nextStatus = useAuthSyncStore.getState().status;
        if (nextStatus !== "failed" && nextStatus !== "auth_expired" && nextStatus !== "disabled_missing_tables") {
          scheduleAutoSync();
        }
      }
    }
  });
}

function ensureCollectionSubscription() {
  if (collectionUnsubscribe) return;

  let lastFingerprint = getLocalSyncFingerprint();

  collectionUnsubscribe = useCollectionStore.subscribe(() => {
    const fingerprint = getLocalSyncFingerprint();
    if (fingerprint === lastFingerprint) return;
    lastFingerprint = fingerprint;

    const { user, mergePrompt, status } = useAuthSyncStore.getState();

    if (!user || mergePrompt || suppressAutoSync || status === "auth_expired" || status === "disabled_missing_tables") {
      return;
    }

    if (prepareCompleted) {
      sessionLocalEdited = true;
    }

    if (syncPromise) {
      pendingAutoSyncAfterCurrent = true;
      setAuthSyncState({ status: "dirty" });
      return;
    }

    setAuthSyncState({ status: "dirty" });
    scheduleAutoSync();
  });
}

export function initializeAuthSync() {
  if (initialized) return;
  initialized = true;

  const supabase = getSupabase();
  if (!supabase) {
    setAuthSyncState({ authReady: true, status: "idle", initialLoadDone: true });
    return;
  }

  ensureCollectionSubscription();

  void (async () => {
    try {
      await waitForCollectionHydration();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const user = data.session?.user ?? null;
      setAuthSyncState({ user, authReady: true, authMessageKey: null, status: user ? "idle" : "idle" });
      if (user) void prepareCloudState(user);
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await handleAuthExpired();
      } else {
        setAuthSyncState({ user: null, authReady: true, status: "failed", messageKey: "account.syncWarning", initialLoadDone: true });
      }
    }
  })();

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const nextUser = session?.user ?? null;
    const previousUser = useAuthSyncStore.getState().user;

    if (event === "SIGNED_OUT") {
      clearAutoSyncTimer();
      preparedUserId = null;
      prepareCompleted = false;
      sessionLocalEdited = false;
      pendingAutoSyncAfterCurrent = false;
      setAuthSyncState({
        user: null,
        status: "idle",
        messageKey: null,
        mergePrompt: null,
        lastSyncedAt: null,
        authReady: true,
        initialLoadDone: false
      });
      return;
    }

    setAuthSyncState({ user: nextUser, authReady: true, authMessageKey: null });

    if (nextUser && previousUser?.id !== nextUser.id) {
      preparedUserId = null;
      prepareCompleted = false;
      sessionLocalEdited = false;
      window.setTimeout(() => {
        void waitForCollectionHydration().then(() => prepareCloudState(nextUser));
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

  if (typeof window === "undefined") return;

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
  prepareCompleted = false;
  sessionLocalEdited = false;
  pendingAutoSyncAfterCurrent = false;

  const supabase = getSupabase();
  try {
    await supabase?.auth.signOut({ scope: "local" });
  } catch {
    setAuthSyncState({ user: null, status: "idle", messageKey: null, mergePrompt: null, lastSyncedAt: null, initialLoadDone: false });
  } finally {
    setAuthSyncState({ user: null, status: "idle", messageKey: null, mergePrompt: null, lastSyncedAt: null, initialLoadDone: false });
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
      markSynced(user.id, snapshot.updatedAt, { messageKey: "account.syncSuccess" });
      sessionLocalEdited = false;
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
      const cloudUpdatedAt = await saveCloudCollection(supabase, user, nextSnapshot);
      markSynced(user.id, cloudUpdatedAt, { messageKey: "account.syncSuccess" });
      sessionLocalEdited = false;
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
  preparedUserId = null;
  prepareCompleted = false;
  sessionLocalEdited = false;
  pendingAutoSyncAfterCurrent = false;
}
