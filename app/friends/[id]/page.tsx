"use client";

import { useParams } from "next/navigation";
import { FriendDetailView, FriendNotFound } from "@/features/trades/FriendDetailView";
import { findFriendByRouteId } from "@/features/trades/friendListTypes";
import { useCollectionHydrated } from "@/hooks/useCollectionHydrated";
import { useRefreshFriendOnOpen } from "@/hooks/useLiveSavedFriends";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function FriendDetailPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const hydrated = useCollectionHydrated();
  const hasFriend = useCollectionStore((state) => Boolean(findFriendByRouteId(state.friends, friendId)));
  const { refreshing, status } = useRefreshFriendOnOpen(friendId, hasFriend);

  if (!hydrated) {
    return <div className="min-h-48" aria-busy="true" />;
  }

  if (!hasFriend) return <FriendNotFound />;

  const liveStatus =
    refreshing ? ("loading" as const) : status === "live" ? ("live" as const) : status === "cached" ? ("cached" as const) : ("idle" as const);

  return <FriendDetailView friendId={friendId} liveStatus={liveStatus} />;
}
