"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { albumId } from "@/lib/cloudSync";
import { validateStickerCodes } from "@/services/stickerCodeService";
import type { TradeFriend, TradeProfilePayload } from "@/types/sticker";

export type TradeShareRecord = {
  shareId: string;
  displayName: string;
  missing: string[];
  duplicates: string[];
  updatedAt: string;
};

type TradeShareRow = {
  share_id: string;
  display_name: string;
  missing: string[] | null;
  duplicates: string[] | null;
  updated_at: string;
};

export function buildStableShareId(userId: string) {
  return `s_${userId.replace(/-/g, "").slice(0, 20)}`;
}

export function tradeProfileFromShare(record: TradeShareRecord): TradeProfilePayload {
  return {
    app: "StickerMate",
    type: "trade-profile",
    schemaVersion: 1,
    name: record.displayName,
    missing: record.missing,
    duplicates: record.duplicates,
    generatedAt: record.updatedAt,
    shareId: record.shareId
  };
}

export function friendFromTradeProfile(payload: TradeProfilePayload, shareId?: string): Omit<TradeFriend, "id" | "importedAt"> {
  return {
    name: payload.name,
    missing: payload.missing,
    duplicates: payload.duplicates,
    shareId: shareId ?? payload.shareId,
    snapshotAt: payload.generatedAt
  };
}

export async function publishTradeShare(
  supabase: SupabaseClient,
  user: User,
  displayName: string,
  missing: string[],
  duplicates: string[]
): Promise<string | null> {
  const shareId = buildStableShareId(user.id);
  const { error } = await supabase.from("trade_shares").upsert(
    {
      share_id: shareId,
      user_id: user.id,
      album_id: albumId,
      display_name: displayName.trim().slice(0, 64) || "StickerMate",
      missing,
      duplicates,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.warn("[trade share] publish failed", error.message);
    return null;
  }

  return shareId;
}

export async function fetchTradeShareByShareId(
  supabase: SupabaseClient,
  shareId: string
): Promise<TradeShareRecord | null> {
  const { data, error } = await supabase
    .from("trade_shares")
    .select("share_id, display_name, missing, duplicates, updated_at")
    .eq("share_id", shareId)
    .eq("album_id", albumId)
    .maybeSingle<TradeShareRow>();

  if (error || !data) return null;

  const missing = validateStickerCodes(Array.isArray(data.missing) ? data.missing : []).validCodes;
  const duplicates = validateStickerCodes(Array.isArray(data.duplicates) ? data.duplicates : []).validCodes;

  return {
    shareId: data.share_id,
    displayName: data.display_name,
    missing,
    duplicates,
    updatedAt: data.updated_at
  };
}

export function mergeFriendWithLiveRecord(friend: TradeFriend, live: TradeShareRecord): TradeFriend {
  const liveTime = new Date(live.updatedAt).getTime();
  const cachedTime = friend.snapshotAt ? new Date(friend.snapshotAt).getTime() : 0;
  if (Number.isFinite(cachedTime) && cachedTime >= liveTime) return friend;

  return {
    ...friend,
    name: live.displayName || friend.name,
    missing: live.missing,
    duplicates: live.duplicates,
    shareId: live.shareId,
    snapshotAt: live.updatedAt
  };
}
