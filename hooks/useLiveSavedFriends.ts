"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import {
  refreshAllSavedFriendsWithShareId,
  refreshSavedFriendById,
  type SavedFriendRefreshStatus
} from "@/lib/refreshSavedFriends";
import { useCollectionStore } from "@/stores/useCollectionStore";

/** Refetch all share-linked friends when Razmene (/trades) opens. */
export function useRefreshSavedFriendsOnOpen(enabled = true) {
  const pathname = usePathname();
  const user = useAuthSyncStore((state) => state.user);
  const initialLoadDone = useAuthSyncStore((state) => state.initialLoadDone);
  const friendShareIds = useCollectionStore((state) =>
    state.friends
      .map((friend) => friend.shareId)
      .filter(Boolean)
      .join("|")
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled || pathname !== "/trades") return;
    if (user && !initialLoadDone) return;

    let cancelled = false;
    setRefreshing(true);

    void refreshAllSavedFriendsWithShareId().finally(() => {
      if (!cancelled) setRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, pathname, user, initialLoadDone, friendShareIds]);

  return { refreshing };
}

/** Refetch one friend when their comparison or list page opens. */
export function useRefreshFriendOnOpen(friendRouteId: string, enabled = true) {
  const pathname = usePathname();
  const user = useAuthSyncStore((state) => state.user);
  const initialLoadDone = useAuthSyncStore((state) => state.initialLoadDone);
  const friendShareId = useCollectionStore((state) => {
    const friend = state.friends.find(
      (item) => item.id === friendRouteId || (item.shareId && item.shareId === friendRouteId)
    );
    return friend?.shareId ?? "";
  });
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<SavedFriendRefreshStatus>("offline");

  useEffect(() => {
    if (!enabled || !friendRouteId) return;
    if (user && !initialLoadDone) return;

    let cancelled = false;
    setRefreshing(true);
    setStatus("offline");

    void refreshSavedFriendById(friendRouteId).then((result) => {
      if (cancelled) return;
      setStatus(result.status);
      setRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, pathname, friendRouteId, friendShareId, user, initialLoadDone]);

  return { refreshing, status };
}

/** @deprecated Use useRefreshSavedFriendsOnOpen */
export function useLiveSavedFriends(enabled = true) {
  useRefreshSavedFriendsOnOpen(enabled);
}

export { refreshSavedFriendById as refreshLiveFriendById, refreshAllSavedFriendsWithShareId as refreshShareFriends };
