"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import {
  createEmptyCloudSnapshot,
  getCloudSyncFailureKind,
  getLocalSnapshot,
  getLocalSyncFingerprint,
  isInvalidRefreshTokenError,
  loadCloudCollection,
  saveCloudCollection,
  saveLocalSnapshot,
  syncNow as syncCloudNow,
  type CloudSnapshot,
  type CloudSyncStatus
} from "@/lib/cloudSync";
import { useCollectionStore, waitForCollectionHydration } from "@/stores/useCollectionStore";
import { backupGuestSnapshotBeforeAuth, restoreGuestCollectionAfterSignOut } from "@/lib/guestProfiles";
import { createClient } from "@/utils/supabase/client";

type AuthSyncState = {
  user: User | null;
  authReady: boolean;
  authMessageKey: string | null;
  status: CloudSyncStatus;
  messageKey: string | null;
  lastSyncedAt: string | null;
  initialLoadDone: boolean;
};

const initialState: AuthSyncState = {
  user: null,
  authReady: false,
  authMessageKey: null,
  status: "idle",
  messageKey: null,
  lastSyncedAt: null,
  initialLoadDone: false
};

export const useAuthSyncStore = create<AuthSyncState>()(() => initialState);

const SYNC_META_KEY = "stickermate-sync-meta";
const LEGACY_MIGRATION_PENDING_KEY = "stickermate-migration-pending";
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

function clearLegacyMigrationState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_MIGRATION_PENDING_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function markSynced(userId: string, cloudUpdatedAt: string, extra: Partial<AuthSyncState> = {}) {
  writeSyncMeta(userId, cloudUpdatedAt);
  setAuthSyncState({
    lastSyncedAt: cloudUpdatedAt,
    status: "synced",
    messageKey: null,
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

function canAutoSyncForUser(user: User | null) {
  if (!user) return false;

  const { authReady, status, initialLoadDone } = useAuthSyncStore.getState();

  return (
    authReady &&
    prepareCompleted &&
    initialLoadDone &&
    preparedUserId === user.id &&
    status !== "syncing" &&
    status !== "auth_expired" &&
    status !== "disabled_missing_tables" &&
    !signOutInFlight
  );
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
  pendingAutoSyncAfterCurrent = false;

  setAuthSyncState({
    user: null,
    authReady: true,
    authMessageKey: "account.sessionExpired",
    status: "auth_expired",
    messageKey: "account.sessionExpired",
    lastSyncedAt: null,
    initialLoadDone: false
  });

  const supabase = getSupabase();
  try {
    await supabase?.auth.signOut({ scope: "local" });
  } catch {
    // Broken refresh tokens can make remote sign-out fail; local auth state is already cleared.
  } finally {
    restoreGuestCollectionAfterSignOut(useCollectionStore.getState().language);
    window.setTimeout(() => {
      authExpiredHandling = false;
    }, 1000);
  }
}

async function applyCloudSnapshot(userId: string, cloud: CloudSnapshot) {
  muteNextLocalStoreSync();
  saveLocalSnapshot(cloud);
  markSynced(userId, cloud.updatedAt);
}

async function prepareCloudState(currentUser: User, force = false) {
  if (!force && preparedUserId === currentUser.id && prepareCompleted) {
    return syncPromise ?? null;
  }

  const supabase = getSupabase();
  if (!supabase) {
    setAuthSyncState({ status: "failed", messageKey: "account.notConfigured", initialLoadDone: true });
    prepareCompleted = true;
    return null;
  }

  return runExclusive(async () => {
    preparedUserId = currentUser.id;
    prepareCompleted = false;
    clearAutoSyncTimer();
    setAuthSyncState({ status: "syncing", messageKey: "account.loadingOnline", initialLoadDone: false });

    try {
      const cloud = await loadCloudCollection(supabase, currentUser.id);

      if (cloud) {
        await applyCloudSnapshot(currentUser.id, cloud);
      } else {
        const empty = createEmptyCloudSnapshot();
        muteNextLocalStoreSync();
        saveLocalSnapshot(empty);
        const cloudUpdatedAt = await saveCloudCollection(supabase, currentUser, empty);
        markSynced(currentUser.id, cloudUpdatedAt);
      }

      prepareCompleted = true;
      return cloud;
    } catch (error) {
      preparedUserId = null;
      prepareCompleted = false;
      setSyncFailure(error);
      return null;
    }
  });
}

async function runAutoSync() {
  const { user } = useAuthSyncStore.getState();
  const supabase = getSupabase();

  if (!supabase || !user || !canAutoSyncForUser(user)) {
    return null;
  }

  if (syncPromise) {
    pendingAutoSyncAfterCurrent = true;
    setAuthSyncState({ status: "dirty" });
    return syncPromise;
  }

  return runExclusive(async () => {
    if (!canAutoSyncForUser(user)) return null;

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

    const { user, status } = useAuthSyncStore.getState();

    if (!user || !canAutoSyncForUser(user) || suppressAutoSync) {
      return;
    }

    if (syncPromise) {
      pendingAutoSyncAfterCurrent = true;
      setAuthSyncState({ status: "dirty" });
      return;
    }

    if (status === "syncing") return;

    setAuthSyncState({ status: "dirty" });
    scheduleAutoSync();
  });
}

export function initializeAuthSync() {
  if (initialized) return;
  initialized = true;

  clearLegacyMigrationState();

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
      if (user) {
        void prepareCloudState(user);
      }
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
      pendingAutoSyncAfterCurrent = false;
      restoreGuestCollectionAfterSignOut(useCollectionStore.getState().language);
      setAuthSyncState({
        user: null,
        status: "idle",
        messageKey: null,
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

  backupGuestSnapshotBeforeAuth();

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
  pendingAutoSyncAfterCurrent = false;

  const guestLanguage = useCollectionStore.getState().language;
  restoreGuestCollectionAfterSignOut(guestLanguage);

  const supabase = getSupabase();
  try {
    await supabase?.auth.signOut({ scope: "local" });
  } catch {
    setAuthSyncState({ user: null, status: "idle", messageKey: null, lastSyncedAt: null, initialLoadDone: false });
  } finally {
    setAuthSyncState({ user: null, status: "idle", messageKey: null, lastSyncedAt: null, initialLoadDone: false });
    signOutInFlight = false;
  }
}

/** Persist current collection (including friends) immediately when signed in. */
export async function flushCollectionSync() {
  const { user } = useAuthSyncStore.getState();
  if (!user) return true;

  const result = await runAutoSync();
  return result !== null;
}

export async function runManualSync() {
  const { user } = useAuthSyncStore.getState();
  const supabase = getSupabase();
  if (!supabase || !user || !canAutoSyncForUser(user)) return null;

  return runExclusive(async () => {
    setAuthSyncState({ status: "syncing", messageKey: null });
    try {
      const snapshot = await syncCloudNow(supabase, user);
      markSynced(user.id, snapshot.updatedAt, { messageKey: "account.syncSuccess" });
      return snapshot;
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
  clearLegacyMigrationState();
  initialized = false;
  syncPromise = null;
  preparedUserId = null;
  prepareCompleted = false;
  pendingAutoSyncAfterCurrent = false;
  signOutInFlight = false;
}
