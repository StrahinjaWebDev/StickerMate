"use client";

import { useEffect } from "react";
import {
  ensureGuestProfiles,
  loadGuestProfile,
  saveActiveGuestSnapshot
} from "@/lib/guestProfiles";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function GuestProfileHydrator() {
  const language = useCollectionStore((state) => state.language);

  useEffect(() => {
    const state = ensureGuestProfiles(language);
    loadGuestProfile(state.activeId, language);

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useCollectionStore.subscribe(() => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveActiveGuestSnapshot();
      }, 400);
    });

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      unsubscribe();
    };
  }, [language]);

  return null;
}
