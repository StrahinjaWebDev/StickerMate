"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  clearDeletionForFriend,
  findExistingFriend,
  normalizeSavedFriends
} from "@/lib/savedFriends";
import { PACK_PRICE_RSD, STICKERS_PER_PACK } from "@/lib/spending";
import { stickerByCode, stickers } from "@/lib/stickers";
import type {
  EntryHistoryItem,
  GuideKey,
  ImportSummary,
  LanguageCode,
  SpendingCategory,
  SpendingCurrency,
  SpendingEntry,
  StickerViewMode,
  ThemePreference,
  TradeFriend,
  TradeHistoryItem
} from "@/types/sticker";

type SpendingInput = {
  date: string;
  amount: number;
  currency: SpendingCurrency;
  category: SpendingCategory;
  packsCount?: number;
  stickersCount?: number;
  note?: string;
  linkedEntryId?: string;
};

type TradeInput = {
  date: string;
  friendName: string;
  stickersGiven: string[];
  stickersReceived: string[];
  note?: string;
  appliedToCollection: boolean;
};

type CollectionStore = {
  quantities: Record<string, number>;
  onboarded: boolean;
  theme: ThemePreference;
  language: LanguageCode;
  viewMode: StickerViewMode;
  selectedCodes: string[];
  recentCodes: string[];
  entryHistory: EntryHistoryItem[];
  friends: TradeFriend[];
  deletedFriendIds: string[];
  deletedShareIds: string[];
  tradeDisplayName: string;
  tradeHistory: TradeHistoryItem[];
  spendingEntries: SpendingEntry[];
  defaultCurrency: SpendingCurrency;
  packPriceRsd: number;
  stickersPerPack: number;
  dismissedGuides: Partial<Record<GuideKey, true>>;
  reviewCurrentIndex: number;
  reviewCompleted: boolean;
  reviewUpdatedAt?: string;
  setOnboarded: (onboarded: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguageCode) => void;
  setViewMode: (viewMode: StickerViewMode) => void;
  setQuantity: (code: string, quantity: number) => void;
  increment: (code: string) => void;
  decrement: (code: string) => void;
  markMany: (codes: string[], quantity: number | "increment" | "decrement") => void;
  addConfirmedCodes: (codes: string[], note: string) => ImportSummary;
  resetCollection: () => void;
  toggleSelected: (code: string) => void;
  clearSelection: () => void;
  selectMany: (codes: string[]) => void;
  setTradeDisplayName: (name: string) => void;
  upsertFriend: (friend: Omit<TradeFriend, "id" | "importedAt">, mode: "update" | "create") => TradeFriend;
  removeFriend: (id: string) => void;
  setDefaultCurrency: (currency: SpendingCurrency) => void;
  addSpendingEntry: (entry: SpendingInput) => SpendingEntry;
  updateSpendingEntry: (id: string, entry: SpendingInput) => void;
  deleteSpendingEntry: (id: string) => void;
  addTradeHistory: (trade: TradeInput) => TradeHistoryItem;
  deleteTradeHistory: (id: string) => void;
  undoTradeHistory: (id: string) => void;
  dismissGuide: (guide: GuideKey) => void;
  resetGuides: () => void;
  setReviewIndex: (index: number) => void;
  markReviewSticker: (code: string, quantity: number, nextIndex: number) => void;
  skipReviewSticker: (nextIndex: number) => void;
  completeReview: () => void;
  resetReview: () => void;
};

function cleanQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.min(999, Math.floor(quantity)));
}

function cleanMoney(amount: number) {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(Math.max(0, amount) * 100) / 100;
}

function cleanOptionalCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const cleaned = Math.max(0, Math.floor(value));
  return cleaned > 0 ? cleaned : undefined;
}

function buildSpendingEntry(input: SpendingInput, existing?: SpendingEntry): SpendingEntry {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? createId("spending"),
    date: input.date,
    amount: cleanMoney(input.amount),
    currency: input.currency,
    category: input.category,
    packsCount: cleanOptionalCount(input.packsCount),
    stickersCount: cleanOptionalCount(input.stickersCount),
    note: input.note?.trim() || undefined,
    linkedEntryId: input.linkedEntryId ?? existing?.linkedEntryId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

function withQuantity(
  quantities: Record<string, number>,
  code: string,
  updater: (quantity: number) => number
) {
  if (!stickerByCode.has(code.toUpperCase())) return quantities;
  const normalized = code.toUpperCase();
  const nextQuantity = cleanQuantity(updater(quantities[normalized] ?? 0));
  const next = { ...quantities };

  if (nextQuantity === 0) delete next[normalized];
  else next[normalized] = nextQuantity;

  return next;
}

function mergeRecent(existing: string[], codes: string[]) {
  return Array.from(new Set([...codes.map((code) => code.toUpperCase()), ...existing])).slice(0, 12);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueValidCodes(codes: string[]) {
  return Array.from(new Set(codes.map((code) => code.trim().toUpperCase()).filter((code) => stickerByCode.has(code))));
}

function applyTradeQuantities(
  quantities: Record<string, number>,
  stickersGiven: string[],
  stickersReceived: string[],
  reverse = false
) {
  let next = quantities;
  const given = uniqueValidCodes(stickersGiven);
  const received = uniqueValidCodes(stickersReceived);
  const decrementCodes = reverse ? received : given;
  const incrementCodes = reverse ? given : received;

  for (const code of decrementCodes) {
    next = withQuantity(next, code, (quantity) => {
      if (reverse) {
        return Math.max(0, quantity - 1);
      }
      return quantity > 1 ? quantity - 1 : quantity;
    });
  }

  for (const code of incrementCodes) {
    next = withQuantity(next, code, (quantity) => quantity + 1);
  }

  return next;
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      quantities: {},
      onboarded: false,
      theme: "system",
      language: "sr",
      viewMode: "list",
      selectedCodes: [],
      recentCodes: [],
      entryHistory: [],
      friends: [],
      deletedFriendIds: [],
      deletedShareIds: [],
      tradeDisplayName: "",
      tradeHistory: [],
      spendingEntries: [],
      defaultCurrency: "RSD",
      packPriceRsd: PACK_PRICE_RSD,
      stickersPerPack: STICKERS_PER_PACK,
      dismissedGuides: {},
      reviewCurrentIndex: 0,
      reviewCompleted: false,
      reviewUpdatedAt: undefined,
      setOnboarded: (onboarded) => set({ onboarded }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setViewMode: (viewMode) => set({ viewMode }),
      setQuantity: (code, quantity) =>
        set((state) => ({
          quantities: withQuantity(state.quantities, code, () => quantity),
          recentCodes: quantity > 0 ? mergeRecent(state.recentCodes, [code]) : state.recentCodes
        })),
      increment: (code) =>
        set((state) => ({
          quantities: withQuantity(state.quantities, code, (quantity) => quantity + 1),
          recentCodes: mergeRecent(state.recentCodes, [code])
        })),
      decrement: (code) =>
        set((state) => ({
          quantities: withQuantity(state.quantities, code, (quantity) => Math.max(0, quantity - 1))
        })),
      markMany: (codes, quantity) =>
        set((state) => {
          let quantities = state.quantities;
          for (const code of codes) {
            quantities = withQuantity(quantities, code, (current) => {
              if (quantity === "increment") return current + 1;
              if (quantity === "decrement") return Math.max(0, current - 1);
              return quantity;
            });
          }
          return {
            quantities,
            recentCodes:
              quantity === 0 || quantity === "decrement" ? state.recentCodes : mergeRecent(state.recentCodes, codes)
          };
        }),
      addConfirmedCodes: (codes, note) => {
        const seen = new Set<string>();
        const newCodes = new Set<string>();
        const duplicateCodes = new Set<string>();
        const invalidCodes: string[] = [];
        let imported = 0;
        let invalid = 0;
        let duplicates = 0;

        set((state) => {
          let next = state.quantities;
          for (const code of codes) {
            const token = code.toUpperCase();
            if (!stickerByCode.has(token)) {
              invalid += 1;
              invalidCodes.push(token);
              continue;
            }
            imported += 1;
            const previousQuantity = next[token] ?? 0;
            if (previousQuantity === 0 && !seen.has(token)) newCodes.add(token);
            if (seen.has(token) || previousQuantity > 0) {
              duplicates += 1;
              duplicateCodes.add(token);
            }
            seen.add(token);
            next = withQuantity(next, token, (quantity) => quantity + 1);
          }

          const historyItem: EntryHistoryItem | undefined =
            imported > 0
              ? {
                  id: createId("entry"),
                  note,
                  codes: Array.from(seen),
                  createdAt: new Date().toISOString()
                }
              : undefined;

          return {
            quantities: next,
            recentCodes: mergeRecent(state.recentCodes, Array.from(seen)),
            entryHistory: historyItem ? [historyItem, ...state.entryHistory].slice(0, 50) : state.entryHistory
          };
        });

        return {
          imported,
          duplicates,
          invalid,
          uniqueImported: seen.size,
          newCodes: Array.from(newCodes),
          duplicateCodes: Array.from(duplicateCodes),
          invalidCodes
        };
      },
      resetCollection: () =>
        set({
          quantities: {},
          selectedCodes: [],
          recentCodes: [],
          entryHistory: [],
          friends: [],
          deletedFriendIds: [],
          deletedShareIds: [],
          tradeDisplayName: "",
          tradeHistory: [],
          spendingEntries: [],
          defaultCurrency: "RSD",
          packPriceRsd: PACK_PRICE_RSD,
          stickersPerPack: STICKERS_PER_PACK,
          viewMode: "list",
          dismissedGuides: {},
          reviewCurrentIndex: 0,
          reviewCompleted: false,
          reviewUpdatedAt: undefined
        }),
      toggleSelected: (code) =>
        set((state) => {
          const selected = new Set(state.selectedCodes);
          if (selected.has(code)) selected.delete(code);
          else selected.add(code);
          return { selectedCodes: Array.from(selected) };
        }),
      clearSelection: () => set({ selectedCodes: [] }),
      selectMany: (codes) => set({ selectedCodes: Array.from(new Set(codes)) }),
      setTradeDisplayName: (name) => set({ tradeDisplayName: name }),
      upsertFriend: (friend, mode) => {
        const importedAt = new Date().toISOString();
        const state = get();
        const existing = findExistingFriend(state.friends, friend);
        const useExisting = Boolean(existing) || mode === "update";
        const nextFriend: TradeFriend = {
          ...friend,
          id: useExisting && existing ? existing.id : createId("friend"),
          shareId: friend.shareId ?? existing?.shareId,
          snapshotAt: friend.snapshotAt ?? importedAt,
          importedAt: useExisting && existing ? existing.importedAt : importedAt
        };
        const cleared = clearDeletionForFriend(state.deletedFriendIds, state.deletedShareIds, nextFriend);
        const mergedFriends = useExisting
          ? state.friends.map((item) => (item.id === nextFriend.id ? nextFriend : item))
          : [nextFriend, ...state.friends];
        const friends = normalizeSavedFriends(mergedFriends, cleared.deletedFriendIds, cleared.deletedShareIds);

        set({
          friends,
          deletedFriendIds: cleared.deletedFriendIds,
          deletedShareIds: cleared.deletedShareIds
        });

        return friends.find((item) => item.id === nextFriend.id) ?? nextFriend;
      },
      removeFriend: (id) => {
        const state = get();
        const removed = state.friends.find((friend) => friend.id === id);
        if (!removed) return;

        set({
          friends: state.friends.filter((friend) => friend.id !== id),
          deletedFriendIds: state.deletedFriendIds.includes(id)
            ? state.deletedFriendIds
            : [...state.deletedFriendIds, id],
          deletedShareIds:
            removed.shareId && !state.deletedShareIds.includes(removed.shareId)
              ? [...state.deletedShareIds, removed.shareId]
              : state.deletedShareIds
        });
      },
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      addSpendingEntry: (entry) => {
        const nextEntry = buildSpendingEntry(entry);
        set((state) => ({ spendingEntries: [nextEntry, ...state.spendingEntries] }));
        return nextEntry;
      },
      updateSpendingEntry: (id, entry) =>
        set((state) => ({
          spendingEntries: state.spendingEntries.map((item) =>
            item.id === id ? buildSpendingEntry(entry, item) : item
          )
        })),
      deleteSpendingEntry: (id) =>
        set((state) => ({
          spendingEntries: state.spendingEntries.filter((entry) => entry.id !== id)
        })),
      addTradeHistory: (trade) => {
        const given = uniqueValidCodes(trade.stickersGiven);
        const received = uniqueValidCodes(trade.stickersReceived);
        const tradeItem: TradeHistoryItem = {
          id: createId("trade"),
          date: trade.date,
          friendName: trade.friendName.trim() || "Friend",
          stickersGiven: given,
          stickersReceived: received,
          note: trade.note?.trim() || undefined,
          appliedToCollection: trade.appliedToCollection,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          quantities: trade.appliedToCollection
            ? applyTradeQuantities(state.quantities, given, received)
            : state.quantities,
          recentCodes: trade.appliedToCollection ? mergeRecent(state.recentCodes, received) : state.recentCodes,
          tradeHistory: [tradeItem, ...state.tradeHistory]
        }));

        return tradeItem;
      },
      deleteTradeHistory: (id) =>
        set((state) => ({
          tradeHistory: state.tradeHistory.filter((trade) => trade.id !== id)
        })),
      undoTradeHistory: (id) =>
        set((state) => {
          const trade = state.tradeHistory.find((item) => item.id === id);
          if (!trade || !trade.appliedToCollection || trade.undoneAt) return state;
          return {
            quantities: applyTradeQuantities(state.quantities, trade.stickersGiven, trade.stickersReceived, true),
            tradeHistory: state.tradeHistory.map((item) =>
              item.id === id ? { ...item, undoneAt: new Date().toISOString() } : item
            )
          };
        }),
      dismissGuide: (guide) =>
        set((state) => ({
          dismissedGuides: { ...state.dismissedGuides, [guide]: true }
        })),
      resetGuides: () => set({ dismissedGuides: {} }),
      setReviewIndex: (index) =>
        set({
          reviewCurrentIndex: Math.max(0, Math.min(stickers.length, Math.floor(index))),
          reviewCompleted: false,
          reviewUpdatedAt: new Date().toISOString()
        }),
      markReviewSticker: (code, quantity, nextIndex) =>
        set((state) => ({
          quantities: withQuantity(state.quantities, code, () => quantity),
          recentCodes: quantity > 0 ? mergeRecent(state.recentCodes, [code]) : state.recentCodes,
          reviewCurrentIndex: Math.max(0, Math.min(stickers.length, Math.floor(nextIndex))),
          reviewCompleted: nextIndex >= stickers.length,
          reviewUpdatedAt: new Date().toISOString()
        })),
      skipReviewSticker: (nextIndex) =>
        set({
          reviewCurrentIndex: Math.max(0, Math.min(stickers.length, Math.floor(nextIndex))),
          reviewCompleted: nextIndex >= stickers.length,
          reviewUpdatedAt: new Date().toISOString()
        }),
      completeReview: () =>
        set({
          reviewCurrentIndex: stickers.length,
          reviewCompleted: true,
          reviewUpdatedAt: new Date().toISOString()
        }),
      resetReview: () =>
        set({
          reviewCurrentIndex: 0,
          reviewCompleted: false,
          reviewUpdatedAt: new Date().toISOString()
        })
    }),
    {
      name: "stickermate-collection",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.deletedShareIds = state.deletedShareIds ?? [];
        state.friends = normalizeSavedFriends(state.friends, state.deletedFriendIds, state.deletedShareIds);
      },
      partialize: (state) => ({
        quantities: state.quantities,
        onboarded: state.onboarded,
        theme: state.theme,
        language: state.language,
        viewMode: state.viewMode,
        recentCodes: state.recentCodes,
        entryHistory: state.entryHistory,
        friends: state.friends,
        deletedFriendIds: state.deletedFriendIds,
        deletedShareIds: state.deletedShareIds,
        tradeDisplayName: state.tradeDisplayName,
        tradeHistory: state.tradeHistory,
        spendingEntries: state.spendingEntries,
        defaultCurrency: state.defaultCurrency,
        packPriceRsd: state.packPriceRsd,
        stickersPerPack: state.stickersPerPack,
        dismissedGuides: state.dismissedGuides,
        reviewCurrentIndex: state.reviewCurrentIndex,
        reviewCompleted: state.reviewCompleted,
        reviewUpdatedAt: state.reviewUpdatedAt
      })
    }
  )
);

export function waitForCollectionHydration(): Promise<void> {
  return new Promise((resolve) => {
    if (useCollectionStore.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = useCollectionStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
