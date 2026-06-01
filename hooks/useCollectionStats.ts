"use client";

import { useMemo } from "react";
import { getStats, stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function useCollectionStats() {
  const quantities = useCollectionStore((state) => state.quantities);
  return useMemo(() => getStats(quantities, stickers), [quantities]);
}
