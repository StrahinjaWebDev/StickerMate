"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getStats, parseStickerCodes, stickerByCode, stickers } from "@/lib/stickers";
import type { ImportSummary, LanguageCode, StickerViewMode, ThemePreference } from "@/types/sticker";

type ExportPayload = {
  app: "StickerMate";
  version: 1;
  exportedAt: string;
  quantities: Record<string, number>;
  stats: ReturnType<typeof getStats>;
  settings: {
    theme: ThemePreference;
    viewMode: StickerViewMode;
    language: LanguageCode;
  };
};

type CollectionStore = {
  quantities: Record<string, number>;
  onboarded: boolean;
  theme: ThemePreference;
  language: LanguageCode;
  viewMode: StickerViewMode;
  selectedCodes: string[];
  recentCodes: string[];
  setOnboarded: (onboarded: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguageCode) => void;
  setViewMode: (viewMode: StickerViewMode) => void;
  setQuantity: (code: string, quantity: number) => void;
  increment: (code: string) => void;
  decrement: (code: string) => void;
  markMany: (codes: string[], quantity: number | "increment" | "decrement") => void;
  quickImport: (input: string) => ImportSummary;
  importPayload: (payload: unknown) => { ok: true } | { ok: false; errorKey: "settings.importInvalidError" | "settings.importMissingQuantitiesError" };
  exportPayload: () => ExportPayload;
  resetCollection: () => void;
  toggleSelected: (code: string) => void;
  clearSelection: () => void;
  selectMany: (codes: string[]) => void;
};

function cleanQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.min(999, Math.floor(quantity)));
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
        set((state) => ({ quantities: withQuantity(state.quantities, code, (quantity) => quantity - 1) })),
      markMany: (codes, quantity) =>
        set((state) => {
          let quantities = state.quantities;
          for (const code of codes) {
            quantities = withQuantity(quantities, code, (current) => {
              if (quantity === "increment") return current + 1;
              if (quantity === "decrement") return current - 1;
              return quantity;
            });
          }
          return {
            quantities,
            recentCodes:
              quantity === 0 || quantity === "decrement" ? state.recentCodes : mergeRecent(state.recentCodes, codes)
          };
        }),
      quickImport: (input) => {
        const tokens = parseStickerCodes(input);
        const seen = new Set<string>();
        const newCodes = new Set<string>();
        const duplicateCodes = new Set<string>();
        const invalidCodes: string[] = [];
        let imported = 0;
        let invalid = 0;
        let duplicates = 0;

        set((state) => {
          let next = state.quantities;
          for (const token of tokens) {
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
          return { quantities: next, recentCodes: mergeRecent(state.recentCodes, Array.from(seen)) };
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
      importPayload: (payload) => {
        if (!payload || typeof payload !== "object") {
          return { ok: false, errorKey: "settings.importInvalidError" };
        }

        const maybePayload = payload as {
          quantities?: unknown;
          settings?: { theme?: ThemePreference; viewMode?: StickerViewMode; language?: LanguageCode };
        };
        if (!maybePayload.quantities || typeof maybePayload.quantities !== "object") {
          return { ok: false, errorKey: "settings.importMissingQuantitiesError" };
        }

        const quantities: Record<string, number> = {};
        for (const [code, quantity] of Object.entries(maybePayload.quantities)) {
          const normalized = code.toUpperCase();
          if (stickerByCode.has(normalized) && typeof quantity === "number") {
            const cleaned = cleanQuantity(quantity);
            if (cleaned > 0) quantities[normalized] = cleaned;
          }
        }

        set({
          quantities,
          onboarded: true,
          theme: maybePayload.settings?.theme ?? get().theme,
          viewMode: maybePayload.settings?.viewMode ?? get().viewMode,
          language: maybePayload.settings?.language ?? get().language
        });

        return { ok: true };
      },
      exportPayload: () => {
        const { quantities, theme, viewMode, language } = get();
        return {
          app: "StickerMate",
          version: 1,
          exportedAt: new Date().toISOString(),
          quantities,
          stats: getStats(quantities, stickers),
          settings: { theme, viewMode, language }
        };
      },
      resetCollection: () => set({ quantities: {}, selectedCodes: [], recentCodes: [] }),
      toggleSelected: (code) =>
        set((state) => {
          const selected = new Set(state.selectedCodes);
          if (selected.has(code)) selected.delete(code);
          else selected.add(code);
          return { selectedCodes: Array.from(selected) };
        }),
      clearSelection: () => set({ selectedCodes: [] }),
      selectMany: (codes) => set({ selectedCodes: Array.from(new Set(codes)) })
    }),
    {
      name: "stickermate-collection",
      partialize: (state) => ({
        quantities: state.quantities,
        onboarded: state.onboarded,
        theme: state.theme,
        language: state.language,
        viewMode: state.viewMode,
        recentCodes: state.recentCodes
      })
    }
  )
);
