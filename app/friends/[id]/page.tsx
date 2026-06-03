"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { FriendDetailView, FriendNotFound } from "@/features/trades/FriendDetailView";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function FriendDetailPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const friends = useCollectionStore((state) => state.friends);
  const friend = useMemo(() => friends.find((item) => item.id === friendId), [friendId, friends]);

  if (!friend) return <FriendNotFound />;

  return <FriendDetailView friend={friend} />;
}
