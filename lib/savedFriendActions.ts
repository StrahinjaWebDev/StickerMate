"use client";

import { flushCollectionSync } from "@/lib/authSyncStore";
import { useCollectionStore } from "@/stores/useCollectionStore";

export async function removeSavedFriend(friendId: string) {
  useCollectionStore.getState().removeFriend(friendId);
  const synced = await flushCollectionSync();
  return synced;
}
