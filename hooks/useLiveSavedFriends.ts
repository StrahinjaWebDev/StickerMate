"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  refreshAllSavedFriendsWithShareId,
  refreshSavedFriendById,
  type SavedFriendRefreshStatus
} from "@/lib/refreshSavedFriends";

/** Refetch all share-linked friends when Razmene (/trades) opens. No timers or focus listeners. */
export function useRefreshSavedFriendsOnOpen(enabled = true) {
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled || pathname !== "/trades") return;

    let cancelled = false;
    setRefreshing(true);

    void refreshAllSavedFriendsWithShareId().finally(() => {
      if (!cancelled) setRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, pathname]);

  return { refreshing };
}

/** Refetch one friend when their comparison or list page opens. */
export function useRefreshFriendOnOpen(friendRouteId: string, enabled = true) {
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<SavedFriendRefreshStatus>("offline");

  useEffect(() => {
    if (!enabled || !friendRouteId) return;

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
  }, [enabled, pathname, friendRouteId]);

  return { refreshing, status };
}

/** @deprecated Use useRefreshSavedFriendsOnOpen */
export function useLiveSavedFriends(enabled = true) {
  useRefreshSavedFriendsOnOpen(enabled);
}

export { refreshSavedFriendById as refreshLiveFriendById, refreshAllSavedFriendsWithShareId as refreshShareFriends };
