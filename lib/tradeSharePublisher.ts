"use client";

import { getProfileInfo } from "@/lib/accountProfile";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import { publishTradeShare } from "@/lib/tradeShareService";
import { buildTradeProfilePayload } from "@/services/tradeQrService";
import { createClient } from "@/utils/supabase/client";
import { useCollectionStore } from "@/stores/useCollectionStore";

const PUBLISH_DELAY_MS = 2000;

let publishTimer: ReturnType<typeof setTimeout> | null = null;
let publishInFlight: Promise<string | null> | null = null;
let lastPublishedKey = "";

function tradeListsKey(missing: string[], duplicates: string[]) {
  return `${missing.join(",")}|${duplicates.join(",")}`;
}

export function scheduleTradeSharePublish() {
  if (publishTimer) clearTimeout(publishTimer);
  publishTimer = setTimeout(() => {
    publishTimer = null;
    void publishCurrentTradeShare();
  }, PUBLISH_DELAY_MS);
}

/** Push latest missing/duplicate lists to Supabase for signed-in users. */
export async function publishCurrentTradeShare(force = false) {
  const user = useAuthSyncStore.getState().user;
  if (!user) return null;

  if (publishInFlight) return publishInFlight;

  publishInFlight = (async () => {
    try {
      const supabase = createClient();
      if (!supabase) return null;

      const state = useCollectionStore.getState();
      const profile = getProfileInfo(user);
      const displayName = state.tradeDisplayName.trim() || profile.displayName || "StickerMate";
      const payload = buildTradeProfilePayload(displayName, state.quantities);
      const key = tradeListsKey(payload.missing, payload.duplicates);

      if (!force && key === lastPublishedKey) return null;

      const shareId = await publishTradeShare(
        supabase,
        user,
        displayName,
        payload.missing,
        payload.duplicates
      );

      if (shareId) lastPublishedKey = key;
      return shareId;
    } finally {
      publishInFlight = null;
    }
  })();

  return publishInFlight;
}

export function resetTradeSharePublishCache() {
  lastPublishedKey = "";
  if (publishTimer) clearTimeout(publishTimer);
  publishTimer = null;
}
