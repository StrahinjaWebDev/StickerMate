"use client";

import { albumId } from "@/lib/cloudSync";
import { dedupeFriends } from "@/lib/savedFriends";
import type { TradeFriend } from "@/types/sticker";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SavedFriendRow = {
  id: string;
  user_id: string;
  album_id: string;
  friend_share_id: string;
  local_friend_id: string;
  friend_display_name: string;
  notes: string | null;
  imported_at: string;
  last_fetched_at: string | null;
  last_snapshot_at: string | null;
  cached_missing_count: number | null;
  cached_duplicate_count: number | null;
  cached_possible_swaps_count: number | null;
  cached_snapshot: { missing?: string[]; duplicates?: string[] } | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type CachedSnapshot = {
  missing: string[];
  duplicates: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: unknown; message?: unknown; status?: unknown };
  const text = `${String(maybe.code ?? "")} ${String(maybe.message ?? "")} ${String(maybe.status ?? "")}`.toLowerCase();
  return (
    maybe.status === 404 ||
    text.includes("pgrst205") ||
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    (text.includes("relation") && text.includes("does not exist"))
  );
}

function readCachedLists(row: SavedFriendRow): CachedSnapshot {
  const snapshot = row.cached_snapshot;
  return {
    missing: Array.isArray(snapshot?.missing) ? snapshot.missing : [],
    duplicates: Array.isArray(snapshot?.duplicates) ? snapshot.duplicates : []
  };
}

export function savedFriendRowToTradeFriend(row: SavedFriendRow): TradeFriend {
  const cached = readCachedLists(row);
  return {
    id: row.local_friend_id,
    name: row.friend_display_name,
    shareId: row.friend_share_id,
    missing: cached.missing,
    duplicates: cached.duplicates,
    notes: row.notes ?? undefined,
    importedAt: row.imported_at,
    snapshotAt: row.last_snapshot_at ?? undefined
  };
}

export function tradeFriendToSavedFriendUpsert(userId: string, friend: TradeFriend) {
  if (!friend.shareId) return null;

  const cached: CachedSnapshot = {
    missing: friend.missing,
    duplicates: friend.duplicates
  };

  return {
    user_id: userId,
    album_id: albumId,
    friend_share_id: friend.shareId,
    local_friend_id: friend.id,
    friend_display_name: friend.name,
    notes: friend.notes ?? null,
    imported_at: friend.importedAt,
    last_snapshot_at: friend.snapshotAt ?? null,
    last_fetched_at: friend.snapshotAt ?? null,
    cached_missing_count: friend.missing.length,
    cached_duplicate_count: friend.duplicates.length,
    cached_snapshot: cached,
    deleted_at: null,
    updated_at: nowIso()
  };
}

export async function loadSavedFriendsFromDb(supabase: SupabaseClient, userId: string): Promise<TradeFriend[]> {
  const { data, error } = await supabase
    .from("saved_friends")
    .select("*")
    .eq("user_id", userId)
    .eq("album_id", albumId)
    .is("deleted_at", null)
    .order("imported_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return dedupeFriends(((data ?? []) as SavedFriendRow[]).map(savedFriendRowToTradeFriend));
}

export async function upsertSavedFriendInDb(
  supabase: SupabaseClient,
  userId: string,
  friend: TradeFriend
): Promise<boolean> {
  const payload = tradeFriendToSavedFriendUpsert(userId, friend);
  if (!payload) return false;

  const { error } = await supabase.from("saved_friends").upsert(payload, {
    onConflict: "user_id,friend_share_id,album_id"
  });

  if (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }

  return true;
}

export async function removeSavedFriendFromDb(
  supabase: SupabaseClient,
  userId: string,
  shareId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("saved_friends")
    .update({ deleted_at: nowIso(), updated_at: nowIso() })
    .eq("user_id", userId)
    .eq("album_id", albumId)
    .eq("friend_share_id", shareId);

  if (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }

  return true;
}

export async function updateSavedFriendLiveCacheInDb(
  supabase: SupabaseClient,
  userId: string,
  friend: TradeFriend,
  fetchedAt: string
): Promise<void> {
  if (!friend.shareId) return;

  const cached: CachedSnapshot = {
    missing: friend.missing,
    duplicates: friend.duplicates
  };

  const { error } = await supabase
    .from("saved_friends")
    .update({
      friend_display_name: friend.name,
      local_friend_id: friend.id,
      notes: friend.notes ?? null,
      last_fetched_at: fetchedAt,
      last_snapshot_at: friend.snapshotAt ?? fetchedAt,
      cached_missing_count: friend.missing.length,
      cached_duplicate_count: friend.duplicates.length,
      cached_snapshot: cached,
      deleted_at: null,
      updated_at: nowIso()
    })
    .eq("user_id", userId)
    .eq("album_id", albumId)
    .eq("friend_share_id", friend.shareId);

  if (error && !isMissingTableError(error)) {
    throw error;
  }
}

function legacyFriendsForMigration(
  legacyFromCloud: TradeFriend[],
  legacyFromLocal: TradeFriend[],
  deletedShareIds: string[]
) {
  const deletedShares = new Set(deletedShareIds.filter(Boolean));
  const merged = dedupeFriends([...legacyFromLocal, ...legacyFromCloud]);
  return merged.filter((friend) => friend.shareId && !deletedShares.has(friend.shareId));
}

/** Upsert legacy settings.friends (share-linked only) into saved_friends when table is empty. */
export async function migrateLegacySettingsFriendsToDb(
  supabase: SupabaseClient,
  userId: string,
  legacyFromCloud: TradeFriend[],
  legacyFromLocal: TradeFriend[],
  deletedShareIds: string[]
): Promise<TradeFriend[]> {
  const candidates = legacyFriendsForMigration(legacyFromCloud, legacyFromLocal, deletedShareIds);
  if (candidates.length === 0) return [];

  for (const friend of candidates) {
    await upsertSavedFriendInDb(supabase, userId, friend);
  }

  return loadSavedFriendsFromDb(supabase, userId);
}

/**
 * Load saved friend relations for a signed-in user.
 * saved_friends is authoritative; legacy settings.friends is migrated once when DB is empty.
 */
export async function hydrateSavedFriendsForSignedInUser(
  supabase: SupabaseClient,
  userId: string,
  options: {
    legacyFromCloud?: TradeFriend[];
    legacyFromLocal?: TradeFriend[];
    deletedShareIds?: string[];
  } = {}
): Promise<TradeFriend[]> {
  const existing = await loadSavedFriendsFromDb(supabase, userId);
  if (existing.length > 0) return existing;

  return migrateLegacySettingsFriendsToDb(
    supabase,
    userId,
    options.legacyFromCloud ?? [],
    options.legacyFromLocal ?? [],
    options.deletedShareIds ?? []
  );
}

export function mergeSignedInFriendsForStore(
  shareLinkedFriends: TradeFriend[],
  localOnlyFriends: TradeFriend[]
): TradeFriend[] {
  return dedupeFriends([...shareLinkedFriends, ...localOnlyFriends.filter((friend) => !friend.shareId)]);
}

/** Strip share-linked friends from cloud snapshot settings — they live in saved_friends. */
export function stripShareLinkedFriendsFromCloudSettings(friends: TradeFriend[]): TradeFriend[] {
  return friends.filter((friend) => !friend.shareId);
}
