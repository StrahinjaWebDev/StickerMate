"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { albumId } from "@/lib/cloudSync";
import { applyLiveTradeRecord, friendNeedsLiveUpdate, type LiveTradeShare } from "@/lib/savedFriends";
import { validateStickerCodes } from "@/services/stickerCodeService";
import type { TradeFriend, TradeProfilePayload } from "@/types/sticker";

export type TradeShareRecord = LiveTradeShare;

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

function parseJsonCodeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchTradeShareByShareId(
  supabase: SupabaseClient,
  shareId: string
): Promise<TradeShareRecord | null> {
  const normalizedShareId = shareId.trim();
  if (!normalizedShareId) return null;

  const { data, error } = await supabase
    .from("trade_shares")
    .select("share_id, display_name, missing, duplicates, updated_at")
    .eq("share_id", normalizedShareId)
    .eq("album_id", albumId)
    .maybeSingle<TradeShareRow>();

  if (error) {
    console.warn("[trade share] fetch failed", normalizedShareId, error.message);
    return null;
  }

  if (!data) {
    console.warn("[trade share] no public profile for share id", normalizedShareId);
    return null;
  }

  const missing = validateStickerCodes(parseJsonCodeList(data.missing)).validCodes;
  const duplicates = validateStickerCodes(parseJsonCodeList(data.duplicates)).validCodes;

  return {
    shareId: data.share_id,
    displayName: data.display_name,
    missing,
    duplicates,
    updatedAt: data.updated_at
  };
}

export function mergeFriendWithLiveRecord(friend: TradeFriend, live: TradeShareRecord): TradeFriend {
  if (!friendNeedsLiveUpdate(friend, live)) return friend;
  return applyLiveTradeRecord(friend, live);
}
