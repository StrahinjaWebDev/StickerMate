"use client";

import { useEffect, useState } from "react";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function useCollectionHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useCollectionStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useCollectionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
