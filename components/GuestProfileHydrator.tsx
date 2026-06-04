"use client";

import { useEffect } from "react";
import { getActiveCollectionPersistScope } from "@/lib/collectionPersistScope";
import { switchToGuestCollectionScope } from "@/lib/collectionBootstrap";
import { ensureGuestIdentity } from "@/lib/guestProfiles";
import { useAuthSyncStore } from "@/lib/authSyncStore";

export function GuestProfileHydrator() {
  const user = useAuthSyncStore((state) => state.user);
  const authReady = useAuthSyncStore((state) => state.authReady);

  useEffect(() => {
    if (!authReady || user) return;

    const guestId = ensureGuestIdentity().id;
    const active = getActiveCollectionPersistScope();
    if (!active || active.type !== "guest" || active.id !== guestId) {
      void switchToGuestCollectionScope(true);
    }
  }, [user, authReady]);

  return null;
}
