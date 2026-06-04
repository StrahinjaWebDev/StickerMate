"use client";

export const SYNC_META_KEY = "stickermate-sync-meta";

export type UserSyncMeta = {
  cloudUpdatedAt: string | null;
  /** Fingerprint of last snapshot successfully pushed/applied for this user. */
  syncedFingerprint: string | null;
};

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined") return window.localStorage;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    return globalThis.localStorage;
  }
  return null;
}

export function readUserSyncMeta(userId: string): UserSyncMeta | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, Partial<UserSyncMeta>>;
    const entry = all[userId];
    if (!entry) return null;
    return {
      cloudUpdatedAt: entry.cloudUpdatedAt ?? null,
      syncedFingerprint: entry.syncedFingerprint ?? null
    };
  } catch {
    return null;
  }
}

export function writeUserSyncMeta(userId: string, meta: UserSyncMeta) {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    const raw = storage.getItem(SYNC_META_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, UserSyncMeta>) : {};
    all[userId] = meta;
    storage.setItem(SYNC_META_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage failures; sync still works without meta.
  }
}

/** True when local store differs from the last synced/applied snapshot for this user. */
export function hasUnsyncedLocalChanges(userId: string, currentFingerprint: string) {
  const meta = readUserSyncMeta(userId);
  if (!meta?.syncedFingerprint) return true;
  return currentFingerprint !== meta.syncedFingerprint;
}
