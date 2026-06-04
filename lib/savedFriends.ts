import type { TradeFriend } from "@/types/sticker";

export type LiveTradeShare = {
  shareId: string;
  displayName: string;
  missing: string[];
  duplicates: string[];
  updatedAt: string;
};

function friendTime(friend: TradeFriend) {
  const snapshot = friend.snapshotAt ? new Date(friend.snapshotAt).getTime() : 0;
  const imported = friend.importedAt ? new Date(friend.importedAt).getTime() : 0;
  return Math.max(snapshot, imported);
}

function listsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((code, index) => code === right[index]);
}

export function friendTradeDataEqual(
  a: Pick<TradeFriend, "name" | "missing" | "duplicates">,
  b: Pick<TradeFriend, "name" | "missing" | "duplicates">
) {
  return a.name === b.name && listsEqual(a.missing, b.missing) && listsEqual(a.duplicates, b.duplicates);
}

export function dedupeFriends(friends: TradeFriend[]) {
  const byKey = new Map<string, TradeFriend>();

  for (const friend of friends) {
    const key = friend.shareId ?? `id:${friend.id}`;
    const existing = byKey.get(key);
    if (!existing || friendTime(friend) >= friendTime(existing)) {
      byKey.set(key, friend);
    }
  }

  return Array.from(byKey.values());
}

export function filterRemovedFriends(
  friends: TradeFriend[],
  deletedFriendIds: string[],
  deletedShareIds: string[]
) {
  const deletedIds = new Set(deletedFriendIds);
  const deletedShares = new Set(deletedShareIds.filter(Boolean));

  return friends.filter(
    (friend) => !deletedIds.has(friend.id) && !(friend.shareId && deletedShares.has(friend.shareId))
  );
}

export function normalizeSavedFriends(
  friends: TradeFriend[],
  deletedFriendIds: string[],
  deletedShareIds: string[]
) {
  return filterRemovedFriends(dedupeFriends(friends), deletedFriendIds, deletedShareIds);
}

export function findExistingFriend(friends: TradeFriend[], incoming: Pick<TradeFriend, "name" | "shareId">) {
  if (incoming.shareId) {
    const byShare = friends.find((friend) => friend.shareId === incoming.shareId);
    if (byShare) return byShare;
  }

  return friends.find((friend) => friend.name.toLowerCase() === incoming.name.toLowerCase());
}

export function applyLiveTradeRecord(friend: TradeFriend, live: LiveTradeShare): TradeFriend {
  return {
    ...friend,
    name: live.displayName || friend.name,
    missing: [...live.missing],
    duplicates: [...live.duplicates],
    shareId: live.shareId,
    snapshotAt: live.updatedAt
  };
}

export function friendNeedsLiveUpdate(friend: TradeFriend, live: LiveTradeShare) {
  return !friendTradeDataEqual(friend, {
    name: live.displayName,
    missing: live.missing,
    duplicates: live.duplicates
  });
}

export function clearDeletionForFriend(
  deletedFriendIds: string[],
  deletedShareIds: string[],
  friend: Pick<TradeFriend, "id" | "shareId">
) {
  return {
    deletedFriendIds: deletedFriendIds.filter((id) => id !== friend.id),
    deletedShareIds: friend.shareId ? deletedShareIds.filter((shareId) => shareId !== friend.shareId) : deletedShareIds
  };
}
