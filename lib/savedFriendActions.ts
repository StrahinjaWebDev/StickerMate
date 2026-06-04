"use client";

import { flushCollectionSync, useAuthSyncStore } from "@/lib/authSyncStore";
import { resolveFriendForImport } from "@/lib/refreshSavedFriends";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

export async function removeSavedFriend(friendId: string) {
  const state = useCollectionStore.getState();
  const friend = state.friends.find((item) => item.id === friendId);
  if (!friend) return true;

  const rollback = {
    friends: state.friends,
    deletedFriendIds: state.deletedFriendIds,
    deletedShareIds: state.deletedShareIds
  };

  useCollectionStore.getState().removeFriend(friendId);
  const synced = await flushCollectionSync();

  if (!synced) {
    useCollectionStore.setState(rollback);
    return false;
  }

  return true;
}

export async function importSavedFriend(friend: Omit<TradeFriend, "id" | "importedAt">) {
  const before = {
    friends: useCollectionStore.getState().friends,
    deletedFriendIds: useCollectionStore.getState().deletedFriendIds,
    deletedShareIds: useCollectionStore.getState().deletedShareIds
  };

  const resolved = await resolveFriendForImport(friend);
  const saved = useCollectionStore.getState().upsertFriend(resolved, "update");
  if (!saved) {
    return { ok: false as const, friend: null, synced: false };
  }

  const inStore = useCollectionStore.getState().friends.some((item) => item.id === saved.id);
  if (!inStore) {
    useCollectionStore.setState(before);
    return { ok: false as const, friend: null, synced: false };
  }

  const { user } = useAuthSyncStore.getState();
  if (!user) {
    return { ok: true as const, friend: saved, synced: true };
  }

  const synced = await flushCollectionSync();
  if (!synced) {
    useCollectionStore.setState(before);
    return { ok: false as const, friend: null, synced: false };
  }

  const persisted = useCollectionStore.getState().friends.find((item) => item.id === saved.id) ?? saved;
  return { ok: true as const, friend: persisted, synced: true };
}
