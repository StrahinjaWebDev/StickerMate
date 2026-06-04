"use client";

import {
  migrateLegacyCollectionToGuestScope,
  persistKeyForScope,
  setCollectionPersistScope,
  COLLECTION_PERSIST_VERSION,
  type CollectionPersistScope
} from "@/lib/collectionPersistScope";
import { ensureGuestIdentity } from "@/lib/guestProfiles";
import {
  partializeCollectionState,
  persistCollectionStoreToScope,
  rehydrateCollectionStore
} from "@/stores/useCollectionStore";

export function initDefaultCollectionScope() {
  if (typeof globalThis === "undefined" || typeof globalThis.localStorage === "undefined") return;
  const guestId = ensureGuestIdentity().id;
  migrateLegacyCollectionToGuestScope(guestId);
  setCollectionPersistScope({ type: "guest", id: guestId });
}

export async function bootstrapCollectionPersistence(userId: string | null) {
  const guestId = ensureGuestIdentity().id;
  migrateLegacyCollectionToGuestScope(guestId);

  setCollectionPersistScope(
    userId ? { type: "user", id: userId } : { type: "guest", id: guestId }
  );

  await rehydrateCollectionStore();
}

export async function switchCollectionPersistScope(
  scope: CollectionPersistScope,
  options: { rehydrate?: boolean; persistLeavingScope?: CollectionPersistScope | null } = {}
) {
  const { rehydrate = true, persistLeavingScope = null } = options;

  if (persistLeavingScope) {
    persistCollectionStoreToScope(persistLeavingScope);
  }

  setCollectionPersistScope(scope);

  if (rehydrate) {
    await rehydrateCollectionStore();
  }
}

export async function switchToGuestCollectionScope(rehydrate = true) {
  const guestId = ensureGuestIdentity().id;
  await switchCollectionPersistScope({ type: "guest", id: guestId }, { rehydrate });
}

export async function switchToUserCollectionScope(
  userId: string,
  options: { rehydrate: boolean; persistGuestFirst?: boolean }
) {
  const guestId = ensureGuestIdentity().id;
  if (options.persistGuestFirst !== false) {
    persistCollectionStoreToScope({ type: "guest", id: guestId });
  }
  await switchCollectionPersistScope(
    { type: "user", id: userId },
    { rehydrate: options.rehydrate, persistLeavingScope: null }
  );
}

export function persistUserCollectionScope(userId: string) {
  persistCollectionStoreToScope({ type: "user", id: userId });
}

export function persistGuestCollectionScope() {
  const guestId = ensureGuestIdentity().id;
  persistCollectionStoreToScope({ type: "guest", id: guestId });
}

export function readScopedPersistKey(scope: CollectionPersistScope) {
  return persistKeyForScope(scope);
}

export { partializeCollectionState, COLLECTION_PERSIST_VERSION };
