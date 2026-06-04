"use client";

import { useParams } from "next/navigation";
import { FriendDetailView, FriendNotFound } from "@/features/trades/FriendDetailView";
import { useRefreshFriendOnOpen } from "@/hooks/useLiveSavedFriends";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function FriendDetailPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const hasFriend = useCollectionStore((state) =>
    Boolean(state.friends.find((item) => item.id === friendId || (item.shareId && item.shareId === friendId)))
  );
  const { refreshing, status } = useRefreshFriendOnOpen(friendId, hasFriend);

  if (!hasFriend) return <FriendNotFound />;

  const liveStatus =
    refreshing ? ("loading" as const) : status === "live" ? ("live" as const) : status === "cached" ? ("cached" as const) : ("idle" as const);

  return <FriendDetailView friendId={friendId} liveStatus={liveStatus} />;
}
