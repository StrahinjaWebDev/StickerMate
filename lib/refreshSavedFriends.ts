"use client";

import { applyLiveTradeRecord, friendTradeDataEqual } from "@/lib/savedFriends";
import { fetchTradeShareByShareId } from "@/lib/tradeShareService";
import { createClient } from "@/utils/supabase/client";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

export type SavedFriendRefreshStatus = "live" | "cached" | "offline";

export function findSavedFriendByRouteId(friendRouteId: string) {
  return useCollectionStore.getState().friends.find(
    (item) => item.id === friendRouteId || (item.shareId && item.shareId === friendRouteId)
  );
}

function persistLiveFriend(
  friend: TradeFriend,
  live: NonNullable<Awaited<ReturnType<typeof fetchTradeShareByShareId>>>
) {
  const next = applyLiveTradeRecord(friend, live);
  const current = useCollectionStore.getState().friends.find((item) => item.id === friend.id) ?? friend;

  if (friendTradeDataEqual(current, next) && current.snapshotAt === live.updatedAt) {
    return current;
  }

  useCollectionStore.getState().upsertFriend({
    name: next.name,
    missing: next.missing,
    duplicates: next.duplicates,
    shareId: next.shareId,
    snapshotAt: live.updatedAt,
    notes: current.notes
  });

  return useCollectionStore.getState().friends.find((item) => item.id === friend.id) ?? next;
}

/** Fetch latest public trade data for one saved friend and update the local cache on success. */
export async function refreshSavedFriendById(friendRouteId: string): Promise<{
  friend: TradeFriend | null;
  status: SavedFriendRefreshStatus;
}> {
  const friend = findSavedFriendByRouteId(friendRouteId);
  if (!friend) return { friend: null, status: "offline" };

  if (!friend.shareId) {
    return { friend, status: "cached" };
  }

  const supabase = createClient();
  if (!supabase) {
    return { friend, status: "cached" };
  }

  try {
    const live = await fetchTradeShareByShareId(supabase, friend.shareId);
    if (!live) {
      return { friend, status: "cached" };
    }

    const updated = persistLiveFriend(friend, live);
    return { friend: updated, status: "live" };
  } catch (error) {
    console.warn("[saved friends] refresh failed", error);
    return { friend, status: "cached" };
  }
}

/** Refresh every saved friend that has a stable share id (Razmene list open). */
export async function refreshAllSavedFriendsWithShareId(): Promise<SavedFriendRefreshStatus> {
  const shareFriends = useCollectionStore.getState().friends.filter((friend) => friend.shareId);

  if (shareFriends.length === 0) return "offline";

  const supabase = createClient();
  if (!supabase) return "cached";

  let anyLive = false;
  let anyAttempted = false;

  for (const friend of shareFriends) {
    if (!friend.shareId) continue;
    anyAttempted = true;

    try {
      const live = await fetchTradeShareByShareId(supabase, friend.shareId);
      if (!live) continue;
      persistLiveFriend(friend, live);
      anyLive = true;
    } catch (error) {
      console.warn("[saved friends] refresh failed for", friend.shareId, error);
    }
  }

  if (anyLive) return "live";
  if (anyAttempted) return "cached";
  return "offline";
}

/** Prefer live trade_shares data over QR snapshot when importing online. */
export async function resolveFriendForImport(
  incoming: Omit<TradeFriend, "id" | "importedAt">
): Promise<Omit<TradeFriend, "id" | "importedAt">> {
  if (!incoming.shareId) return incoming;

  const supabase = createClient();
  if (!supabase) return incoming;

  try {
    const live = await fetchTradeShareByShareId(supabase, incoming.shareId);
    if (!live) return incoming;

    return {
      name: live.displayName || incoming.name,
      missing: live.missing,
      duplicates: live.duplicates,
      shareId: live.shareId,
      snapshotAt: live.updatedAt,
      notes: incoming.notes
    };
  } catch {
    return incoming;
  }
}
