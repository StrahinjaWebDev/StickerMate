"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FriendDetailView, FriendNotFound } from "@/features/trades/FriendDetailView";
import { fetchTradeShareByShareId, mergeFriendWithLiveRecord } from "@/lib/tradeShareService";
import { createClient } from "@/utils/supabase/client";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

export default function FriendDetailPage() {
  const params = useParams();
  const friendId = String(params.id ?? "");
  const storedFriend = useCollectionStore((state) => state.friends.find((item) => item.id === friendId));
  const upsertFriend = useCollectionStore((state) => state.upsertFriend);
  const [friend, setFriend] = useState<TradeFriend | null>(storedFriend ?? null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "live" | "cached">("idle");

  useEffect(() => {
    setFriend(storedFriend ?? null);
  }, [storedFriend]);

  useEffect(() => {
    const shareId = storedFriend?.shareId;
    if (!shareId || !storedFriend) {
      setLiveStatus("idle");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setLiveStatus("cached");
      return;
    }

    let cancelled = false;
    setLiveStatus("loading");

    void (async () => {
      const live = await fetchTradeShareByShareId(supabase, shareId);
      if (cancelled) return;

      if (live) {
        const merged = mergeFriendWithLiveRecord(storedFriend, live);
        setFriend(merged);
        if (
          merged.missing.length !== storedFriend.missing.length ||
          merged.duplicates.length !== storedFriend.duplicates.length ||
          merged.snapshotAt !== storedFriend.snapshotAt
        ) {
          upsertFriend(
            {
              name: merged.name,
              missing: merged.missing,
              duplicates: merged.duplicates,
              shareId: merged.shareId,
              snapshotAt: merged.snapshotAt,
              notes: storedFriend.notes
            },
            "update"
          );
        }
        setLiveStatus("live");
      } else {
        setLiveStatus("cached");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storedFriend, upsertFriend]);

  const displayFriend = useMemo(() => friend ?? storedFriend, [friend, storedFriend]);

  if (!displayFriend) return <FriendNotFound />;

  return <FriendDetailView friend={displayFriend} liveStatus={liveStatus} />;
}
