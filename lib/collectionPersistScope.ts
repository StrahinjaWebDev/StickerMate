"use client";

import type { StateStorage } from "zustand/middleware";

export type CollectionPersistScope = {
  type: "guest" | "user";
  id: string;
};

export const LEGACY_COLLECTION_KEY = "stickermate-collection";
export const SCOPED_COLLECTION_MIGRATION_KEY = "stickermate-collection-scoped-migrated-v1";
export const COLLECTION_PERSIST_VERSION = 0;
const GUEST_PROFILE_KEY_PREFIX = "stickermate-guest-profile:";

let activeScope: CollectionPersistScope | null = null;

export function persistKeyForScope(scope: CollectionPersistScope): string {
  return scope.type === "guest" ? `stickermate-guest:${scope.id}` : `stickermate-user:${scope.id}`;
}

export function getActiveCollectionPersistScope(): CollectionPersistScope | null {
  return activeScope;
}

export function setCollectionPersistScope(scope: CollectionPersistScope) {
  activeScope = scope;
}

export function createScopedCollectionStorage(): StateStorage {
  return {
    getItem: () => {
      if (!activeScope || !storageAvailable()) return null;
      try {
        return globalThis.localStorage.getItem(persistKeyForScope(activeScope));
      } catch {
        return null;
      }
    },
    setItem: (_name, value) => {
      if (!activeScope || !storageAvailable()) return;
      try {
        globalThis.localStorage.setItem(persistKeyForScope(activeScope), value);
      } catch {
        // Ignore quota / private mode failures.
      }
    },
    removeItem: () => {
      if (!activeScope || !storageAvailable()) return;
      try {
        globalThis.localStorage.removeItem(persistKeyForScope(activeScope));
      } catch {
        // Ignore storage failures.
      }
    }
  };
}

function storageAvailable() {
  return typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined";
}

export function readPersistPayload(key: string): string | null {
  if (!storageAvailable()) return null;
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePersistPayload(key: string, payload: string) {
  if (!storageAvailable()) return;
  try {
    globalThis.localStorage.setItem(key, payload);
  } catch {
    // Ignore storage failures.
  }
}

/** Convert legacy guest profile CloudSnapshot JSON into zustand persist envelope. */
function guestProfileSnapshotToPersistEnvelope(raw: string): string | null {
  try {
    const snapshot = JSON.parse(raw) as Record<string, unknown>;
    const settings = (snapshot.settings ?? {}) as Record<string, unknown>;
    const reviewState = (snapshot.reviewState ?? {}) as Record<string, unknown>;

    const state = {
      quantities: snapshot.quantities ?? {},
      onboarded: snapshot.onboarded ?? false,
      theme: settings.theme ?? "system",
      language: settings.language ?? "sr",
      viewMode: settings.viewMode ?? "list",
      recentCodes: settings.recentCodes ?? [],
      entryHistory: settings.entryHistory ?? [],
      friends: settings.friends ?? [],
      deletedFriendIds: settings.deletedFriendIds ?? [],
      deletedShareIds: settings.deletedShareIds ?? [],
      tradeDisplayName: settings.tradeDisplayName ?? "",
      tradeHistory: snapshot.tradeHistory ?? [],
      spendingEntries: snapshot.spendingEntries ?? [],
      defaultCurrency: settings.defaultCurrency ?? "RSD",
      packPriceRsd: settings.packPriceRsd,
      stickersPerPack: settings.stickersPerPack,
      dismissedGuides: snapshot.dismissedGuides ?? {},
      reviewCurrentIndex: reviewState.currentIndex ?? settings.reviewCurrentIndex ?? 0,
      reviewCompleted: reviewState.completed ?? settings.reviewCompleted ?? false,
      reviewUpdatedAt: reviewState.updatedAt ?? settings.reviewUpdatedAt
    };

    return JSON.stringify({ state, version: COLLECTION_PERSIST_VERSION });
  } catch {
    return null;
  }
}

/**
 * Move legacy global stickermate-collection into guest scope only (never into user scope).
 * Existing signed-in cloud data must not be overwritten by this migration.
 */
export function migrateLegacyCollectionToGuestScope(guestId: string) {
  if (!storageAvailable()) return;

  const guestKey = persistKeyForScope({ type: "guest", id: guestId });
  const guestExisting = readPersistPayload(guestKey);

  if (!guestExisting) {
    const legacy = readPersistPayload(LEGACY_COLLECTION_KEY);
    if (legacy) {
      writePersistPayload(guestKey, legacy);
    } else {
      const profileEnvelope = guestProfileSnapshotToPersistEnvelope(
        readPersistPayload(`${GUEST_PROFILE_KEY_PREFIX}${guestId}`) ?? ""
      );
      if (profileEnvelope) {
        writePersistPayload(guestKey, profileEnvelope);
      }
    }
  }

  try {
    globalThis.localStorage.setItem(SCOPED_COLLECTION_MIGRATION_KEY, guestId);
  } catch {
    // Ignore storage failures.
  }
}

export function resetCollectionPersistScopeForTests() {
  activeScope = null;
}
