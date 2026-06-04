"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyLiveTradeRecord, friendNeedsLiveUpdate } from "@/lib/savedFriends";
import { fetchTradeShareByShareId } from "@/lib/tradeShareService";
import { createClient } from "@/utils/supabase/client";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

export function findSavedFriendByRouteId(friendRouteId: string) {
  return useCollectionStore.getState().friends.find(
    (item) => item.id === friendRouteId || (item.shareId && item.shareId === friendRouteId)
  );
}

async function applyLiveRecordToFriend(friend: TradeFriend, live: Awaited<ReturnType<typeof fetchTradeShareByShareId>>) {
  if (!live) return { friend, updated: false };

  const current = useCollectionStore.getState().friends.find((item) => item.id === friend.id) ?? friend;
  if (!friendNeedsLiveUpdate(current, live)) {
    return { friend: current, updated: false };
  }

  useCollectionStore.getState().upsertFriend(
    {
      name: live.displayName,
      missing: live.missing,
      duplicates: live.duplicates,
      shareId: live.shareId,
      snapshotAt: live.updatedAt,
      notes: current.notes
    },
    "update"
  );

  const updated =
    useCollectionStore.getState().friends.find((item) => item.id === friend.id) ??
    applyLiveTradeRecord(current, live);

  return { friend: updated, updated: true };
}

export async function refreshShareFriends() {
  const supabase = createClient();
  if (!supabase) return;

  const shareFriends = useCollectionStore.getState().friends.filter((friend) => friend.shareId);
  if (shareFriends.length === 0) return;

  for (const friend of shareFriends) {
    if (!friend.shareId) continue;
    const live = await fetchTradeShareByShareId(supabase, friend.shareId);
    if (!live) continue;
    await applyLiveRecordToFriend(friend, live);
  }
}

/** Refresh saved friends that have a live share id from Supabase. */
export function useLiveSavedFriends(enabled = true) {
  const pathname = usePathname();
  const shareKey = useCollectionStore((state) =>
    state.friends
      .map((friend) => `${friend.id}:${friend.shareId ?? ""}`)
      .join("|")
  );

  const refresh = useCallback(async () => {
    if (!enabled) return;
    await refreshShareFriends();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void (async () => {
      if (cancelled) return;
      await refresh();
    })();

    function onVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh, pathname, shareKey]);
}

export async function refreshLiveFriendById(friendRouteId: string) {
  const friend = findSavedFriendByRouteId(friendRouteId);
  if (!friend) {
    return { friend: null, liveStatus: "idle" as const };
  }

  if (!friend.shareId) {
    return { friend, liveStatus: "cached" as const };
  }

  const supabase = createClient();
  if (!supabase) {
    return { friend, liveStatus: "cached" as const };
  }

  const live = await fetchTradeShareByShareId(supabase, friend.shareId);
  if (!live) {
    return { friend, liveStatus: "cached" as const };
  }

  const result = await applyLiveRecordToFriend(friend, live);
  return { friend: result.friend, liveStatus: "live" as const };
}
