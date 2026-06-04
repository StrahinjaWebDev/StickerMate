"use client";

import { useEffect, useRef } from "react";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import { publishCurrentTradeShare, resetTradeSharePublishCache, scheduleTradeSharePublish } from "@/lib/tradeSharePublisher";
import { useCollectionStore } from "@/stores/useCollectionStore";

/** Keep public trade_shares in Supabase aligned with the signed-in user's collection. */
export function TradeSharePublisher() {
  const user = useAuthSyncStore((state) => state.user);
  const quantities = useCollectionStore((state) => state.quantities);
  const tradeDisplayName = useCollectionStore((state) => state.tradeDisplayName);
  const skipFirstQuantityChange = useRef(true);

  useEffect(() => {
    if (!user) {
      skipFirstQuantityChange.current = true;
      resetTradeSharePublishCache();
      return;
    }

    void publishCurrentTradeShare(true);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (skipFirstQuantityChange.current) {
      skipFirstQuantityChange.current = false;
      return;
    }

    scheduleTradeSharePublish();
  }, [user, quantities, tradeDisplayName]);

  return null;
}
