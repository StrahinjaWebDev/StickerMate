"use client";

import { useParams } from "next/navigation";
import { FriendDetailView, FriendNotFound } from "@/features/trades/FriendDetailView";
import { useRefreshFriendOnOpen } from "@/hooks/useLiveSavedFriends";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function FriendDetailPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const storedFriend = useCollectionStore((state) =>
    state.friends.find((item) => item.id === friendId || (item.shareId && item.shareId === friendId))
  );
  const { refreshing, status } = useRefreshFriendOnOpen(storedFriend?.id ?? "", Boolean(storedFriend));

  if (!storedFriend) return <FriendNotFound />;

  const liveStatus = refreshing ? ("loading" as const) : status === "live" ? ("live" as const) : ("cached" as const);

  return <FriendDetailView friend={storedFriend} liveStatus={liveStatus} />;
}
