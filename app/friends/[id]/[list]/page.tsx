"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { FriendNotFound } from "@/features/trades/FriendDetailView";
import { FriendListNotFound, FriendStickerListView } from "@/features/trades/FriendStickerListView";
import { findFriendByRouteId, isFriendListType } from "@/features/trades/friendListTypes";
import { useCollectionHydrated } from "@/hooks/useCollectionHydrated";
import { useRefreshFriendOnOpen } from "@/hooks/useLiveSavedFriends";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function FriendListPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const listParam = String(params.list ?? "");
  const hydrated = useCollectionHydrated();
  const friends = useCollectionStore((state) => state.friends);
  const friend = useMemo(() => findFriendByRouteId(friends, friendId), [friendId, friends]);

  useRefreshFriendOnOpen(friendId, Boolean(friend));

  if (!hydrated) {
    return <div className="min-h-48" aria-busy="true" />;
  }

  if (!isFriendListType(listParam)) return <FriendListNotFound />;
  if (!friend) return <FriendNotFound />;

  return <FriendStickerListView friend={friend} listType={listParam} />;
}
