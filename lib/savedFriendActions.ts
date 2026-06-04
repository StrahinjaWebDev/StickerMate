"use client";

import { flushCollectionSync } from "@/lib/authSyncStore";
import { useCollectionStore } from "@/stores/useCollectionStore";

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
