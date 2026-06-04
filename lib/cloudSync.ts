"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getEntryAmountRsd, PACK_PRICE_RSD, STICKERS_PER_PACK } from "@/lib/spending";
import { dedupeFriends, filterRemovedFriends, normalizeSavedFriends } from "@/lib/savedFriends";
import { stickerByCode } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type {
  EntryHistoryItem,
  GuideKey,
  LanguageCode,
  SpendingCurrency,
  SpendingEntry,
  StickerViewMode,
  ThemePreference,
  TradeFriend,
  TradeHistoryItem
} from "@/types/sticker";

export const albumId = "fifa-world-cup-2026";

export type CloudSyncStatus = "idle" | "dirty" | "syncing" | "synced" | "failed" | "auth_expired" | "disabled_missing_tables";

export type CloudSyncFailureKind = "missing_tables" | "failed";

export type CloudSnapshot = {
  albumId: string;
  quantities: Record<string, number>;
  settings: {
    theme: ThemePreference;
    language: LanguageCode;
    viewMode: StickerViewMode;
    defaultCurrency: SpendingCurrency;
    packPriceRsd: number;
    stickersPerPack: number;
    tradeDisplayName: string;
    friends: TradeFriend[];
    deletedFriendIds: string[];
    deletedShareIds?: string[];
    recentCodes: string[];
    entryHistory: EntryHistoryItem[];
  };
  reviewState: {
    currentIndex: number;
    completed: boolean;
    updatedAt?: string;
  };
  onboarded: boolean;
  dismissedGuides: Partial<Record<GuideKey, true>>;
  tradeHistory: TradeHistoryItem[];
  spendingEntries: SpendingEntry[];
  updatedAt: string;
};

type CollectionRow = {
  quantities: Record<string, number>;
  settings: Partial<CloudSnapshot["settings"]> | null;
  review_state: Partial<CloudSnapshot["reviewState"]> | null;
  onboarding_completed: boolean;
  dismissed_help: Partial<Record<GuideKey, true>> | null;
  updated_at: string | null;
};

type TradeRow = {
  id: string;
  friend_name: string | null;
  stickers_given: string[] | null;
  stickers_received: string[] | null;
  note: string | null;
  applied_to_collection: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type SpendingRow = {
  id: string;
  amount_rsd: number | string;
  packs_count: number | null;
  stickers_count: number | null;
  category: SpendingEntry["category"] | null;
  note: string | null;
  date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

export function getCloudSyncFailureKind(error: unknown): CloudSyncFailureKind {
  if (!error || typeof error !== "object") return "failed";
  const maybeError = error as { code?: unknown; status?: unknown; message?: unknown; details?: unknown };
  const text = `${String(maybeError.code ?? "")} ${String(maybeError.status ?? "")} ${String(maybeError.message ?? "")} ${String(maybeError.details ?? "")}`.toLowerCase();

  if (
    maybeError.status === 404 ||
    text.includes("404") ||
    text.includes("pgrst205") ||
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    text.includes("relation") && text.includes("does not exist")
  ) {
    return "missing_tables";
  }

  return "failed";
}

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { name?: unknown; message?: unknown; code?: unknown; status?: unknown };
  const text = `${String(maybeError.name ?? "")} ${String(maybeError.message ?? "")} ${String(maybeError.code ?? "")} ${String(maybeError.status ?? "")}`.toLowerCase();
  return text.includes("invalid refresh token") || text.includes("refresh token not found");
}

function cleanQuantities(quantities: Record<string, number>) {
  const next: Record<string, number> = {};
  for (const [code, quantity] of Object.entries(quantities)) {
    const normalized = code.toUpperCase();
    const cleaned = Math.max(0, Math.min(999, Math.floor(Number(quantity) || 0)));
    if (cleaned > 0 && stickerByCode.has(normalized)) next[normalized] = cleaned;
  }
  return next;
}

function getSnapshotReviewState(snapshot: CloudSnapshot) {
  const legacySettings = snapshot.settings as Partial<CloudSnapshot["settings"]> & {
    reviewCurrentIndex?: number;
    reviewCompleted?: boolean;
    reviewUpdatedAt?: string;
  };

  return {
    currentIndex: snapshot.reviewState?.currentIndex ?? legacySettings.reviewCurrentIndex ?? 0,
    completed: snapshot.reviewState?.completed ?? legacySettings.reviewCompleted ?? false,
    updatedAt: snapshot.reviewState?.updatedAt ?? legacySettings.reviewUpdatedAt
  };
}

function mergeById<T extends { id: string; updatedAt?: string; createdAt?: string; importedAt?: string }>(
  local: T[],
  cloud: T[]
) {
  const byId = new Map<string, T>();
  for (const item of [...cloud, ...local]) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    const existingTime = existing.updatedAt ?? existing.createdAt ?? existing.importedAt ?? "";
    const itemTime = item.updatedAt ?? item.createdAt ?? item.importedAt ?? "";
    byId.set(item.id, itemTime >= existingTime ? item : existing);
  }
  return Array.from(byId.values());
}

function mergeFriends(
  local: TradeFriend[],
  cloud: TradeFriend[],
  localDeletedIds: string[],
  cloudDeletedIds: string[],
  localDeletedShareIds: string[],
  cloudDeletedShareIds: string[]
) {
  const merged = dedupeFriends(mergeById(local, cloud));
  return filterRemovedFriends(
    merged,
    [...localDeletedIds, ...cloudDeletedIds],
    [...localDeletedShareIds, ...cloudDeletedShareIds]
  );
}

function mergeDeletedFriendIds(local: string[], cloud: string[]) {
  return Array.from(new Set([...local, ...cloud]));
}

export function getLocalSnapshot(): CloudSnapshot {
  const state = useCollectionStore.getState();
  return {
    albumId,
    quantities: cleanQuantities(state.quantities),
    settings: {
      theme: state.theme,
      language: state.language,
      viewMode: state.viewMode,
      defaultCurrency: state.defaultCurrency,
      packPriceRsd: PACK_PRICE_RSD,
      stickersPerPack: STICKERS_PER_PACK,
      tradeDisplayName: state.tradeDisplayName,
      friends: state.friends,
      deletedFriendIds: state.deletedFriendIds,
      deletedShareIds: state.deletedShareIds,
      recentCodes: state.recentCodes,
      entryHistory: state.entryHistory
    },
    reviewState: {
      currentIndex: state.reviewCurrentIndex,
      completed: state.reviewCompleted,
      updatedAt: state.reviewUpdatedAt
    },
    onboarded: state.onboarded,
    dismissedGuides: state.dismissedGuides,
    tradeHistory: state.tradeHistory,
    spendingEntries: state.spendingEntries,
    updatedAt: nowIso()
  };
}

export function hasMeaningfulGuestData(snapshot: CloudSnapshot) {
  return (
    Object.keys(snapshot.quantities).length > 0 ||
    snapshot.tradeHistory.length > 0 ||
    snapshot.spendingEntries.length > 0 ||
    snapshot.settings.friends.length > 0
  );
}

export function hasMeaningfulLocalData(snapshot = getLocalSnapshot()) {
  return hasMeaningfulGuestData(snapshot);
}

export function hasMeaningfulCloudData(snapshot: CloudSnapshot) {
  return hasMeaningfulGuestData(snapshot);
}

export function createEmptyCloudSnapshot(preserveFrom?: CloudSnapshot): CloudSnapshot {
  const base = preserveFrom ?? getLocalSnapshot();
  return {
    albumId,
    quantities: {},
    settings: {
      theme: base.settings.theme,
      language: base.settings.language,
      viewMode: base.settings.viewMode,
      defaultCurrency: base.settings.defaultCurrency,
      packPriceRsd: PACK_PRICE_RSD,
      stickersPerPack: STICKERS_PER_PACK,
      tradeDisplayName: "",
      friends: [],
      deletedFriendIds: [],
      deletedShareIds: [],
      recentCodes: [],
      entryHistory: []
    },
    reviewState: {
      currentIndex: 0,
      completed: false,
      updatedAt: undefined
    },
    onboarded: base.onboarded,
    dismissedGuides: base.dismissedGuides,
    tradeHistory: [],
    spendingEntries: [],
    updatedAt: nowIso()
  };
}

export function snapshotsAreEquivalent(a: CloudSnapshot, b: CloudSnapshot) {
  const aCodes = Object.keys(a.quantities);
  const bCodes = Object.keys(b.quantities);
  if (aCodes.length !== bCodes.length) return false;

  for (const code of aCodes) {
    if ((b.quantities[code] ?? 0) !== a.quantities[code]) return false;
  }

  return (
    a.tradeHistory.length === b.tradeHistory.length &&
    a.spendingEntries.length === b.spendingEntries.length &&
    a.settings.friends.length === b.settings.friends.length &&
    a.settings.entryHistory.length === b.settings.entryHistory.length &&
    a.onboarded === b.onboarded
  );
}

export function saveLocalSnapshot(snapshot: CloudSnapshot) {
  const reviewState = getSnapshotReviewState(snapshot);

  useCollectionStore.setState({
    quantities: cleanQuantities(snapshot.quantities),
    onboarded: snapshot.onboarded,
    theme: snapshot.settings.theme ?? "system",
    language: snapshot.settings.language ?? "sr",
    viewMode: snapshot.settings.viewMode ?? "list",
    defaultCurrency: snapshot.settings.defaultCurrency ?? "RSD",
    packPriceRsd: PACK_PRICE_RSD,
    stickersPerPack: STICKERS_PER_PACK,
    tradeDisplayName: snapshot.settings.tradeDisplayName ?? "",
    friends: normalizeSavedFriends(
      snapshot.settings.friends ?? [],
      snapshot.settings.deletedFriendIds ?? [],
      snapshot.settings.deletedShareIds ?? []
    ),
    deletedFriendIds: snapshot.settings.deletedFriendIds ?? [],
    deletedShareIds: snapshot.settings.deletedShareIds ?? [],
    recentCodes: snapshot.settings.recentCodes ?? [],
    entryHistory: snapshot.settings.entryHistory ?? [],
    dismissedGuides: snapshot.dismissedGuides ?? {},
    tradeHistory: snapshot.tradeHistory ?? [],
    spendingEntries: snapshot.spendingEntries ?? [],
    reviewCurrentIndex: reviewState.currentIndex,
    reviewCompleted: reviewState.completed,
    reviewUpdatedAt: reviewState.updatedAt
  });
}

export async function loadCloudCollection(supabase: SupabaseClient, userId: string) {
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("quantities, settings, review_state, onboarding_completed, dismissed_help, updated_at")
    .eq("user_id", userId)
    .eq("album_id", albumId)
    .maybeSingle<CollectionRow>();

  if (collectionError) throw collectionError;
  if (!collection) return null;

  const [{ data: trades, error: tradesError }, { data: spending, error: spendingError }] = await Promise.all([
    supabase
      .from("trades")
      .select("id, friend_name, stickers_given, stickers_received, note, applied_to_collection, created_at, updated_at")
      .eq("user_id", userId)
      .eq("album_id", albumId)
      .order("created_at", { ascending: false }),
    supabase
      .from("spending_entries")
      .select("id, amount_rsd, packs_count, stickers_count, category, note, date, created_at, updated_at")
      .eq("user_id", userId)
      .eq("album_id", albumId)
      .order("created_at", { ascending: false })
  ]);

  if (tradesError) throw tradesError;
  if (spendingError) throw spendingError;

  const settings = collection.settings ?? {};
  const reviewState = collection.review_state ?? {};
  const legacySettings = settings as Partial<CloudSnapshot["settings"]> & {
    reviewCurrentIndex?: number;
    reviewCompleted?: boolean;
    reviewUpdatedAt?: string;
  };

  return {
    albumId,
    quantities: cleanQuantities(collection.quantities ?? {}),
    settings: {
      theme: settings.theme ?? "system",
      language: settings.language ?? "sr",
      viewMode: settings.viewMode ?? "list",
      defaultCurrency: settings.defaultCurrency ?? "RSD",
      packPriceRsd: PACK_PRICE_RSD,
      stickersPerPack: STICKERS_PER_PACK,
      tradeDisplayName: settings.tradeDisplayName ?? "",
      friends: settings.friends ?? [],
      deletedFriendIds: Array.isArray(settings.deletedFriendIds) ? settings.deletedFriendIds : [],
      deletedShareIds: Array.isArray(settings.deletedShareIds) ? settings.deletedShareIds : [],
      recentCodes: settings.recentCodes ?? [],
      entryHistory: settings.entryHistory ?? []
    },
    reviewState: {
      currentIndex: reviewState.currentIndex ?? legacySettings.reviewCurrentIndex ?? 0,
      completed: reviewState.completed ?? legacySettings.reviewCompleted ?? false,
      updatedAt: reviewState.updatedAt ?? legacySettings.reviewUpdatedAt
    },
    onboarded: collection.onboarding_completed,
    dismissedGuides: collection.dismissed_help ?? {},
    tradeHistory: ((trades ?? []) as TradeRow[]).map((trade) => ({
      id: trade.id,
      date: trade.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      friendName: trade.friend_name ?? "",
      stickersGiven: Array.isArray(trade.stickers_given) ? trade.stickers_given : [],
      stickersReceived: Array.isArray(trade.stickers_received) ? trade.stickers_received : [],
      note: trade.note ?? undefined,
      appliedToCollection: trade.applied_to_collection,
      createdAt: trade.created_at ?? nowIso()
    })),
    spendingEntries: ((spending ?? []) as SpendingRow[]).map((entry) => ({
      id: entry.id,
      date: entry.date ?? new Date().toISOString().slice(0, 10),
      amount: Number(entry.amount_rsd) || 0,
      currency: "RSD",
      category: entry.category ?? "other",
      packsCount: entry.packs_count && entry.packs_count > 0 ? entry.packs_count : undefined,
      stickersCount: entry.stickers_count && entry.stickers_count > 0 ? entry.stickers_count : undefined,
      note: entry.note ?? undefined,
      createdAt: entry.created_at ?? nowIso(),
      updatedAt: entry.updated_at ?? entry.created_at ?? nowIso()
    })),
    updatedAt: collection.updated_at ?? nowIso()
  } satisfies CloudSnapshot;
}

export function getLocalSyncFingerprint() {
  const snapshot = getLocalSnapshot();
  return JSON.stringify({ ...snapshot, updatedAt: "" });
}

export async function saveCloudCollection(
  supabase: SupabaseClient,
  user: User,
  snapshot = getLocalSnapshot()
): Promise<string> {
  const updatedAt = nowIso();

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email,
      avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      updated_at: updatedAt
    },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;

  const { error: collectionError } = await supabase.from("collections").upsert(
    {
      user_id: user.id,
      album_id: albumId,
      quantities: cleanQuantities(snapshot.quantities),
      settings: snapshot.settings,
      review_state: snapshot.reviewState,
      onboarding_completed: snapshot.onboarded,
      dismissed_help: snapshot.dismissedGuides,
      updated_at: updatedAt
    },
    { onConflict: "user_id,album_id" }
  );
  if (collectionError) throw collectionError;

  const { error: deleteTradesError } = await supabase
    .from("trades")
    .delete()
    .eq("user_id", user.id)
    .eq("album_id", albumId);
  if (deleteTradesError) throw deleteTradesError;

  if (snapshot.tradeHistory.length > 0) {
    const { error } = await supabase.from("trades").insert(
      snapshot.tradeHistory.map((trade) => ({
        user_id: user.id,
        album_id: albumId,
        friend_name: trade.friendName,
        stickers_given: trade.stickersGiven,
        stickers_received: trade.stickersReceived,
        note: trade.note ?? null,
        applied_to_collection: trade.appliedToCollection,
        created_at: trade.createdAt,
        updated_at: updatedAt
      }))
    );
    if (error) throw error;
  }

  const { error: deleteSpendingError } = await supabase
    .from("spending_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("album_id", albumId);
  if (deleteSpendingError) throw deleteSpendingError;

  if (snapshot.spendingEntries.length > 0) {
    const { error } = await supabase.from("spending_entries").insert(
      snapshot.spendingEntries.map((entry) => ({
        user_id: user.id,
        album_id: albumId,
        amount_rsd: getEntryAmountRsd(entry),
        packs_count: entry.packsCount ?? 0,
        stickers_count: entry.stickersCount ?? 0,
        category: entry.category,
        note: entry.note ?? null,
        date: entry.date,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt
      }))
    );
    if (error) throw error;
  }

  return updatedAt;
}

export function mergeLocalAndCloud(local: CloudSnapshot, cloud: CloudSnapshot) {
  // Sticker quantities use max(local, cloud). Lists merge by id with newest timestamp winning.
  const quantities: Record<string, number> = { ...cloud.quantities };
  const localReviewState = getSnapshotReviewState(local);
  const cloudReviewState = getSnapshotReviewState(cloud);

  for (const [code, quantity] of Object.entries(local.quantities)) {
    quantities[code] = Math.max(quantities[code] ?? 0, quantity);
  }

  return {
    ...cloud,
    quantities: cleanQuantities(quantities),
    settings: {
      ...cloud.settings,
      ...local.settings,
      friends: mergeFriends(
        local.settings.friends,
        cloud.settings.friends,
        local.settings.deletedFriendIds ?? [],
        cloud.settings.deletedFriendIds ?? [],
        local.settings.deletedShareIds ?? [],
        cloud.settings.deletedShareIds ?? []
      ),
      deletedFriendIds: mergeDeletedFriendIds(
        local.settings.deletedFriendIds ?? [],
        cloud.settings.deletedFriendIds ?? []
      ),
      deletedShareIds: mergeDeletedFriendIds(
        local.settings.deletedShareIds ?? [],
        cloud.settings.deletedShareIds ?? []
      ),
      recentCodes: Array.from(new Set([...local.settings.recentCodes, ...cloud.settings.recentCodes])).slice(0, 12),
      entryHistory: mergeById(local.settings.entryHistory, cloud.settings.entryHistory),
    },
    reviewState: {
      currentIndex: Math.max(localReviewState.currentIndex, cloudReviewState.currentIndex),
      completed: localReviewState.completed || cloudReviewState.completed,
      updatedAt: localReviewState.updatedAt ?? cloudReviewState.updatedAt
    },
    onboarded: local.onboarded || cloud.onboarded,
    dismissedGuides: { ...cloud.dismissedGuides, ...local.dismissedGuides },
    tradeHistory: mergeById(local.tradeHistory, cloud.tradeHistory),
    spendingEntries: mergeById(local.spendingEntries, cloud.spendingEntries),
    updatedAt: nowIso()
  } satisfies CloudSnapshot;
}

export async function syncNow(supabase: SupabaseClient, user: User) {
  const snapshot = getLocalSnapshot();
  const cloudUpdatedAt = await saveCloudCollection(supabase, user, snapshot);
  return { ...snapshot, updatedAt: cloudUpdatedAt };
}
