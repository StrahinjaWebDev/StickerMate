"use client";

import { useEffect } from "react";
import {
  hydrateGuestSnapshot,
  saveGuestSnapshot
} from "@/lib/guestProfiles";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function GuestProfileHydrator() {
  const language = useCollectionStore((state) => state.language);
  const user = useAuthSyncStore((state) => state.user);

  useEffect(() => {
    if (user) return;

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
  }, [language, user]);

  return null;
}
