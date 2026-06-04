"use client";

import { flushCollectionSync, useAuthSyncStore } from "@/lib/authSyncStore";
import { resolveFriendForImport } from "@/lib/refreshSavedFriends";
import { removeSavedFriendFromDb, upsertSavedFriendInDb } from "@/lib/savedFriendsDb";
import { createClient } from "@/utils/supabase/client";
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

  const { user } = useAuthSyncStore.getState();
  const supabase = createClient();

  if (user && friend.shareId && supabase) {
    try {
      await removeSavedFriendFromDb(supabase, user.id, friend.shareId);
    } catch (error) {
      console.warn("[saved friends] remove from db failed", error);
      return false;
    }
  }

  useCollectionStore.getState().removeFriend(friendId);
  const synced = user ? await flushCollectionSync() : true;

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

  const supabase = createClient();
  if (saved.shareId && supabase) {
    try {
      await upsertSavedFriendInDb(supabase, user.id, saved);
    } catch (error) {
      console.warn("[saved friends] upsert to db failed", error);
      useCollectionStore.setState(before);
      return { ok: false as const, friend: null, synced: false };
    }
  }

  const synced = await flushCollectionSync();
  if (!synced) {
    useCollectionStore.setState(before);
    return { ok: false as const, friend: null, synced: false };
  }

  const persisted = useCollectionStore.getState().friends.find((item) => item.id === saved.id) ?? saved;
  return { ok: true as const, friend: persisted, synced: true };
}
