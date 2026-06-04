"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { FriendDetailView, FriendNotFound } from "@/features/trades/FriendDetailView";
import { refreshLiveFriendById } from "@/hooks/useLiveSavedFriends";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

export default function FriendDetailPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const pathname = usePathname();
  const storedFriend = useCollectionStore((state) =>
    state.friends.find((item) => item.id === friendId || (item.shareId && item.shareId === friendId))
  );
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "live" | "cached">("idle");

  const activeFriendId = storedFriend?.id;
  const activeShareId = storedFriend?.shareId;

  useEffect(() => {
    if (!activeFriendId) {
      setLiveStatus("idle");
      return;
    }

    let cancelled = false;
    setLiveStatus("loading");

    const currentFriendId = activeFriendId;

    void (async () => {
      const result = await refreshLiveFriendById(currentFriendId);
      if (cancelled) return;
      setLiveStatus(result.liveStatus === "idle" ? "cached" : result.liveStatus);
    })();

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void refreshLiveFriendById(currentFriendId).then((result) => {
        if (!cancelled) setLiveStatus(result.liveStatus === "idle" ? "cached" : result.liveStatus);
      });
    }

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, activeFriendId, activeShareId]);

  const friend: TradeFriend | undefined = storedFriend;

  if (!friend) return <FriendNotFound />;

  return <FriendDetailView friend={friend} liveStatus={liveStatus} />;
}
