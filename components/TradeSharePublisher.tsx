"use client";

import { useEffect } from "react";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import { publishCurrentTradeShare, resetTradeSharePublishCache, scheduleTradeSharePublish } from "@/lib/tradeSharePublisher";
import { useCollectionStore } from "@/stores/useCollectionStore";

/** Keep public trade_shares in Supabase aligned with the signed-in user's collection. */
export function TradeSharePublisher() {
  const user = useAuthSyncStore((state) => state.user);
  const quantities = useCollectionStore((state) => state.quantities);
  const tradeDisplayName = useCollectionStore((state) => state.tradeDisplayName);

  useEffect(() => {
    if (!user) {
      resetTradeSharePublishCache();
      return;
    }

    void publishCurrentTradeShare(true);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    scheduleTradeSharePublish();
  }, [user, quantities, tradeDisplayName]);

  return null;
}
