"use client";

import { flushCollectionSync, useAuthSyncStore } from "@/lib/authSyncStore";
import { persistDebug } from "@/lib/persistDebug";
import { findExistingFriend } from "@/lib/savedFriends";
import { refreshSavedFriendById, resolveFriendForImport } from "@/lib/refreshSavedFriends";
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
  const wasUpdate = Boolean(findExistingFriend(useCollectionStore.getState().friends, resolved));
  const saved = useCollectionStore.getState().upsertFriend(resolved, "update");
  if (!saved) {
    return { ok: false as const, friend: null, synced: false, wasUpdate: false };
  }

  const inStore = useCollectionStore.getState().friends.some((item) => item.id === saved.id);
  if (!inStore) {
    useCollectionStore.setState(before);
    return { ok: false as const, friend: null, synced: false, wasUpdate: false };
  }

  let persisted = useCollectionStore.getState().friends.find((item) => item.id === saved.id) ?? saved;

  if (persisted.shareId) {
    void refreshSavedFriendById(persisted.id).then((refreshed) => {
      if (refreshed.friend) {
        persistDebug("import-background-refresh", { friendId: refreshed.friend.id });
      }
    });
  }

  const { user } = useAuthSyncStore.getState();
  if (!user) {
    persistDebug("import-saved-local", { friendId: persisted.id, shareId: persisted.shareId });
    return { ok: true as const, friend: persisted, synced: true, wasUpdate };
  }

  const supabase = createClient();
  if (persisted.shareId && supabase) {
    try {
      await upsertSavedFriendInDb(supabase, user.id, persisted);
    } catch (error) {
      console.warn("[saved friends] upsert to db failed", error);
      useCollectionStore.setState(before);
      return { ok: false as const, friend: null, synced: false, wasUpdate: false };
    }
  }

  const synced = await flushCollectionSync();
  persisted = useCollectionStore.getState().friends.find((item) => item.id === saved.id) ?? persisted;

  if (!synced) {
    persistDebug("import-saved-pending-sync", { friendId: persisted.id, shareId: persisted.shareId });
    return { ok: true as const, friend: persisted, synced: false, wasUpdate };
  }

  persistDebug("import-saved", { friendId: persisted.id, shareId: persisted.shareId, wasUpdate });
  return { ok: true as const, friend: persisted, synced: true, wasUpdate };
}
