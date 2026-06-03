"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { FriendNotFound } from "@/features/trades/FriendDetailView";
import { FriendListNotFound, FriendStickerListView } from "@/features/trades/FriendStickerListView";
import { isFriendListType } from "@/features/trades/friendListTypes";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function FriendListPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const listParam = String(params.list ?? "");
  const friends = useCollectionStore((state) => state.friends);
  const friend = useMemo(() => friends.find((item) => item.id === friendId), [friendId, friends]);

  if (!isFriendListType(listParam)) return <FriendListNotFound />;
  if (!friend) return <FriendNotFound />;

  return <FriendStickerListView friend={friend} listType={listParam} />;
}
