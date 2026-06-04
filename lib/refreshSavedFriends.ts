"use client";

import { applyLiveTradeRecord, friendTradeDataEqual } from "@/lib/savedFriends";
import {
  loadSavedFriendRelationByLocalId,
  loadSavedFriendRelationByShareId,
  updateSavedFriendLiveCacheInDb
} from "@/lib/savedFriendsDb";
import { persistDebug } from "@/lib/persistDebug";
import { fetchTradeShareByShareId } from "@/lib/tradeShareService";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import { createClient } from "@/utils/supabase/client";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

export type SavedFriendRefreshStatus = "live" | "cached" | "offline";

const LIVE_FETCH_RETRY_MS = 400;

export function findSavedFriendByRouteId(friendRouteId: string) {
  return useCollectionStore.getState().friends.find(
    (item) => item.id === friendRouteId || (item.shareId && item.shareId === friendRouteId)
  );
}

/** Signed-in users: wait for cloud/saved_friends hydrate before first live refresh. */
export function waitForSignedInFriendHydration(): Promise<void> {
  const { user, initialLoadDone } = useAuthSyncStore.getState();
  if (!user || initialLoadDone) return Promise.resolve();

  return new Promise((resolve) => {
    if (useAuthSyncStore.getState().initialLoadDone) {
      resolve();
      return;
    }

    const unsub = useAuthSyncStore.subscribe((state) => {
      if (!state.user || state.initialLoadDone) {
        unsub();
        resolve();
      }
    });
  });
}

async function enrichFriendShareIdFromSavedRelation(friend: TradeFriend): Promise<TradeFriend> {
  if (friend.shareId) return friend;

  const { user } = useAuthSyncStore.getState();
  if (!user) return friend;

  const supabase = createClient();
  if (!supabase) return friend;

  const row =
    (await loadSavedFriendRelationByLocalId(supabase, user.id, friend.id)) ??
    (friend.id.startsWith("s_") ? await loadSavedFriendRelationByShareId(supabase, user.id, friend.id) : null);

  if (!row?.friend_share_id) return friend;

  useCollectionStore.getState().upsertFriend({
    name: row.friend_display_name || friend.name,
    missing: friend.missing,
    duplicates: friend.duplicates,
    shareId: row.friend_share_id,
    snapshotAt: friend.snapshotAt,
    notes: friend.notes ?? row.notes ?? undefined
  });

  return (
    useCollectionStore.getState().friends.find(
      (item) => item.id === friend.id || item.shareId === row.friend_share_id
    ) ?? { ...friend, shareId: row.friend_share_id }
  );
}

function persistLiveFriend(
  friend: TradeFriend,
  live: NonNullable<Awaited<ReturnType<typeof fetchTradeShareByShareId>>>
) {
  const next = applyLiveTradeRecord(friend, live);
  const current = useCollectionStore.getState().friends.find(
    (item) => item.id === friend.id || (item.shareId && item.shareId === next.shareId)
  ) ?? friend;

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

  const updated =
    useCollectionStore.getState().friends.find(
      (item) => item.id === current.id || (item.shareId && item.shareId === next.shareId)
    ) ?? next;
  const { user } = useAuthSyncStore.getState();
  const supabase = createClient();

  if (user && updated.shareId && supabase) {
    void updateSavedFriendLiveCacheInDb(supabase, user.id, updated, live.updatedAt).catch((error) => {
      console.warn("[saved friends] cache update failed", error);
    });
  }

  return updated;
}

async function fetchLiveTradeShareWithRetry(supabase: NonNullable<ReturnType<typeof createClient>>, shareId: string) {
  const first = await fetchTradeShareByShareId(supabase, shareId);
  if (first) return first;

  if (typeof window !== "undefined") {
    await new Promise((resolve) => window.setTimeout(resolve, LIVE_FETCH_RETRY_MS));
    return fetchTradeShareByShareId(supabase, shareId);
  }

  return null;
}

async function fetchAndPersistLiveFriend(friend: TradeFriend): Promise<{
  friend: TradeFriend;
  status: SavedFriendRefreshStatus;
}> {
  const enriched = await enrichFriendShareIdFromSavedRelation(friend);

  if (!enriched.shareId) {
    return { friend: enriched, status: "cached" };
  }

  const supabase = createClient();
  if (!supabase) {
    return { friend: enriched, status: "cached" };
  }

  const live = await fetchLiveTradeShareWithRetry(supabase, enriched.shareId);
  if (!live) {
    persistDebug("friend-refresh-cached", { shareId: enriched.shareId, friendId: enriched.id });
    return { friend: enriched, status: "cached" };
  }

  const updated = persistLiveFriend(enriched, live);
  persistDebug("friend-refresh-live", {
    shareId: enriched.shareId,
    friendId: updated.id,
    missing: updated.missing.length,
    duplicates: updated.duplicates.length
  });
  return { friend: updated, status: "live" };
}

/** Fetch latest public trade data for one saved friend and update the local cache on success. */
export async function refreshSavedFriendById(friendRouteId: string): Promise<{
  friend: TradeFriend | null;
  status: SavedFriendRefreshStatus;
}> {
  await waitForSignedInFriendHydration();

  const friend = findSavedFriendByRouteId(friendRouteId);
  if (!friend) return { friend: null, status: "offline" };

  try {
    return await fetchAndPersistLiveFriend(friend);
  } catch (error) {
    console.warn("[saved friends] refresh failed", error);
    return { friend, status: "cached" };
  }
}

/** Refresh every saved friend that has a stable share id (Razmene list open). */
export async function refreshAllSavedFriendsWithShareId(): Promise<SavedFriendRefreshStatus> {
  await waitForSignedInFriendHydration();

  let shareFriends = useCollectionStore.getState().friends.filter((friend) => friend.shareId);

  if (shareFriends.length === 0) {
    const enriched: TradeFriend[] = [];
    for (const friend of useCollectionStore.getState().friends) {
      enriched.push(await enrichFriendShareIdFromSavedRelation(friend));
    }
    shareFriends = enriched.filter((friend) => friend.shareId);
  }

  if (shareFriends.length === 0) return "offline";

  const supabase = createClient();
  if (!supabase) return "cached";

  let anyLive = false;
  let anyAttempted = false;

  for (const friend of shareFriends) {
    if (!friend.shareId) continue;
    anyAttempted = true;

    try {
      const result = await fetchAndPersistLiveFriend(friend);
      if (result.status === "live") anyLive = true;
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
    const live = await fetchLiveTradeShareWithRetry(supabase, incoming.shareId);
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
