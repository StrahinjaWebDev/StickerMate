"use client";

import { useCallback, useEffect } from "react";
import { applyLiveTradeRecord, friendNeedsLiveUpdate } from "@/lib/savedFriends";
import { fetchTradeShareByShareId } from "@/lib/tradeShareService";
import { createClient } from "@/utils/supabase/client";
import { useCollectionStore } from "@/stores/useCollectionStore";

async function refreshShareFriends() {
  const supabase = createClient();
  if (!supabase) return;

  const { friends, upsertFriend } = useCollectionStore.getState();
  const shareFriends = friends.filter((friend) => friend.shareId);
  if (shareFriends.length === 0) return;

  for (const friend of shareFriends) {
    if (!friend.shareId) continue;

    const live = await fetchTradeShareByShareId(supabase, friend.shareId);
    if (!live) continue;

    const current = useCollectionStore.getState().friends.find((item) => item.id === friend.id);
    if (!current || !friendNeedsLiveUpdate(current, live)) continue;

    upsertFriend(
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
  }
}

/** Refresh saved friends that have a live share id from Supabase. */
export function useLiveSavedFriends(enabled = true) {
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
  }, [enabled, refresh]);
}

export async function refreshLiveFriendById(friendId: string) {
  const friend = useCollectionStore.getState().friends.find((item) => item.id === friendId);
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

  const needsUpdate = friendNeedsLiveUpdate(friend, live);
  if (needsUpdate) {
    useCollectionStore.getState().upsertFriend(
      {
        name: live.displayName,
        missing: live.missing,
        duplicates: live.duplicates,
        shareId: live.shareId,
        snapshotAt: live.updatedAt,
        notes: friend.notes
      },
      "update"
    );
  }

  const updated =
    useCollectionStore.getState().friends.find((item) => item.id === friendId) ??
    applyLiveTradeRecord(friend, live);

  return { friend: updated, liveStatus: "live" as const };
}
