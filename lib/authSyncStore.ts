"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import {
  createEmptyCloudSnapshot,
  getCloudSyncFailureKind,
  getLocalSnapshot,
  getLocalSyncFingerprint,
  hasMeaningfulCloudData,
  hasMeaningfulGuestData,
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

type MergePromptReason = "guest-local" | "both-have-data";

type MergePrompt = {
  cloud: CloudSnapshot | null;
  reason: MergePromptReason;
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
const MIGRATION_PENDING_KEY = "stickermate-migration-pending";
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

type StoredMigrationPending = {
  userId: string;
  reason: MergePromptReason;
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

function readMigrationPending(): StoredMigrationPending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MIGRATION_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredMigrationPending;
  } catch {
    return null;
  }
}

function writeMigrationPending(userId: string, reason: MergePromptReason) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MIGRATION_PENDING_KEY, JSON.stringify({ userId, reason } satisfies StoredMigrationPending));
  } catch {
    // Ignore storage failures.
  }
}

function clearMigrationPending() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MIGRATION_PENDING_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function isMigrationBlocking(userId: string | undefined) {
  if (!userId) return false;
  const { mergePrompt } = useAuthSyncStore.getState();
  if (mergePrompt) return true;
  const pending = readMigrationPending();
  return pending?.userId === userId;
}

function markSynced(userId: string, cloudUpdatedAt: string, extra: Partial<AuthSyncState> = {}) {
  writeSyncMeta(userId, cloudUpdatedAt);
  clearMigrationPending();
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

function showMigrationPrompt(userId: string, cloud: CloudSnapshot | null, reason: MergePromptReason) {
  writeMigrationPending(userId, reason);
  setAuthSyncState({
    mergePrompt: { cloud, reason },
    status: "idle",
    messageKey: null,
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
}

async function prepareCloudState(currentUser: User, force = false) {
  if (!force && preparedUserId === currentUser.id && prepareCompleted) {
    const pending = readMigrationPending();
    if (pending?.userId === currentUser.id && !useAuthSyncStore.getState().mergePrompt) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const cloud = await loadCloudCollection(supabase, currentUser.id);
          showMigrationPrompt(currentUser.id, cloud, pending.reason);
        } catch {
          showMigrationPrompt(currentUser.id, null, pending.reason);
        }
      }
    }
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
    setAuthSyncState({ status: "syncing", messageKey: "account.loadingOnline", mergePrompt: null });

    try {
      const local = getLocalSnapshot();
      const cloud = await loadCloudCollection(supabase, currentUser.id);
      const guestData = hasMeaningfulGuestData(local);
      const cloudData = cloud ? hasMeaningfulCloudData(cloud) : false;

      if (!guestData) {
        clearMigrationPending();
        if (cloud) {
          await applyCloudSnapshot(currentUser.id, cloud);
        } else if (!hasMeaningfulGuestData(local)) {
          const cloudUpdatedAt = await saveCloudCollection(supabase, currentUser, local);
          markSynced(currentUser.id, cloudUpdatedAt);
        } else {
          setAuthSyncState({ status: "idle", initialLoadDone: true });
        }
        prepareCompleted = true;
        return cloud;
      }

      if (cloud && snapshotsAreEquivalent(local, cloud)) {
        markSynced(currentUser.id, cloud.updatedAt);
        prepareCompleted = true;
        return cloud;
      }

      const reason: MergePromptReason = cloudData ? "both-have-data" : "guest-local";
      showMigrationPrompt(currentUser.id, cloud, reason);
      prepareCompleted = true;
      return null;
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
    !prepareCompleted ||
    mergePrompt ||
    isMigrationBlocking(user.id) ||
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

    if (
      !user ||
      !prepareCompleted ||
      mergePrompt ||
      isMigrationBlocking(user.id) ||
      suppressAutoSync ||
      status === "auth_expired" ||
      status === "disabled_missing_tables"
    ) {
      return;
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
  const { user, mergePrompt } = useAuthSyncStore.getState();
  const supabase = getSupabase();
  if (!supabase || !user || mergePrompt || isMigrationBlocking(user.id)) return null;

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

export async function resolveCloudMerge(action: "local" | "cloud" | "merge" | "later") {
  const { user, mergePrompt } = useAuthSyncStore.getState();
  const supabase = getSupabase();
  if (!supabase || !user || !mergePrompt) return null;

  if (action === "later") {
    writeMigrationPending(user.id, mergePrompt.reason);
    setAuthSyncState({ status: "idle", messageKey: "account.migrationPendingHint" });
    return null;
  }

  return runExclusive(async () => {
    setAuthSyncState({ status: "syncing", messageKey: null });

    try {
      const local = getLocalSnapshot();
      const cloudBase = mergePrompt.cloud ?? createEmptyCloudSnapshot(local);

      let nextSnapshot: CloudSnapshot;
      if (action === "cloud") {
        nextSnapshot = cloudBase;
      } else if (action === "merge") {
        nextSnapshot = mergeLocalAndCloud(local, cloudBase);
      } else {
        if (!hasMeaningfulGuestData(local) && hasMeaningfulCloudData(cloudBase)) {
          await applyCloudSnapshot(user.id, cloudBase);
          return cloudBase;
        }
        nextSnapshot = local;
      }

      muteNextLocalStoreSync();
      saveLocalSnapshot(nextSnapshot);
      const cloudUpdatedAt = await saveCloudCollection(supabase, user, nextSnapshot);
      markSynced(user.id, cloudUpdatedAt, { messageKey: "account.syncSuccess" });
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
  clearMigrationPending();
  initialized = false;
  syncPromise = null;
  preparedUserId = null;
  prepareCompleted = false;
  pendingAutoSyncAfterCurrent = false;
}
