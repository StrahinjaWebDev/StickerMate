"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FriendDetailView, FriendNotFound } from "@/features/trades/FriendDetailView";
import { refreshLiveFriendById } from "@/hooks/useLiveSavedFriends";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

export default function FriendDetailPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const storedFriend = useCollectionStore((state) => state.friends.find((item) => item.id === friendId));
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "live" | "cached">("idle");

  useEffect(() => {
    if (!storedFriend) {
      setLiveStatus("idle");
      return;
    }

    let cancelled = false;
    setLiveStatus("loading");

    void (async () => {
      const result = await refreshLiveFriendById(friendId);
      if (cancelled) return;
      setLiveStatus(result.liveStatus === "idle" ? "cached" : result.liveStatus);
    })();

    return () => {
      cancelled = true;
    };
  }, [friendId, storedFriend]);

  const friend: TradeFriend | undefined = storedFriend;

  if (!friend) return <FriendNotFound />;

  return <FriendDetailView friend={friend} liveStatus={liveStatus} />;
}
