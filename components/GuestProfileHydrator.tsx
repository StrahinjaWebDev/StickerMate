"use client";

import { useEffect } from "react";
import {
  hydrateGuestSnapshot,
  saveGuestSnapshot
} from "@/lib/guestProfiles";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function GuestProfileHydrator() {
  const language = useCollectionStore((state) => state.language);

  useEffect(() => {
    hydrateGuestSnapshot(language);

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useCollectionStore.subscribe(() => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveGuestSnapshot();
      }, 400);
    });

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      unsubscribe();
    };
  }, [language]);

  return null;
}
