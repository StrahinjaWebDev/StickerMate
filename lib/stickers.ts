import checklist from "@/data/stickers.json";
import type { CollectionStats, Sticker, StickerChecklist, StickerFilter } from "@/types/sticker";

const source = checklist as StickerChecklist;
const lastStickerImageBase = "https://www.laststicker.com/i/cards/12176";

export const allStickers: Sticker[] = source.stickers.map((sticker) => {
  const imageCode = sticker.code.toLowerCase();
  return {
    ...sticker,
    imageCode,
    imageUrl: `${lastStickerImageBase}/${imageCode}.jpg`,
    imageSource: "laststicker"
  };
});
export const standardAlbumStickerCount = 980;
export const standardAlbumStickers: Sticker[] = allStickers.filter(isAlbumSticker);
export const stickers: Sticker[] = standardAlbumStickers;
export const stickerCount = stickers.length;
export const edition = source.edition;

if (stickerCount !== standardAlbumStickerCount) {
  throw new Error(`StickerMate standard album must contain ${standardAlbumStickerCount} stickers, found ${stickerCount}.`);
}

export const stickerByCode = new Map(stickers.map((sticker) => [sticker.code.toUpperCase(), sticker]));
export const allStickerByCode = new Map(allStickers.map((sticker) => [normalizeStickerCode(sticker.code), sticker]));

export const teams = Array.from(new Set(stickers.map((sticker) => sticker.team))).sort((a, b) =>
  a.localeCompare(b)
);

export const stickersByTeam = teams.map((team) => ({
  team,
  stickers: stickers.filter((sticker) => sticker.team === team)
}));

export function getSticker(code: string) {
  return stickerByCode.get(code.toUpperCase());
}

export function getAnySticker(code: string) {
  return allStickerByCode.get(normalizeStickerCode(code));
}

export function getStandardAlbumStickers() {
  return standardAlbumStickers;
}

export function isAlbumSticker(sticker: Pick<Sticker, "code">) {
  return !/s$/.test(sticker.code);
}

export function getLocalStickerImagePath(sticker: Sticker) {
  return `/stickers/${sticker.imageCode ?? sticker.code.toLowerCase()}.jpg`;
}

export function getQuantity(quantities: Record<string, number>, code: string) {
  return Math.max(0, quantities[code] ?? 0);
}

export function getDuplicateCount(quantities: Record<string, number>, code: string) {
  return Math.max(getQuantity(quantities, code) - 1, 0);
}

export function getTradableCount(quantities: Record<string, number>, code: string) {
  return getDuplicateCount(quantities, code);
}

export function getMissingCodes(quantities: Record<string, number>, list: Sticker[] = stickers) {
  return list.filter((sticker) => getQuantity(quantities, sticker.code) === 0).map((sticker) => sticker.code);
}

export function getTradableDuplicateCodes(quantities: Record<string, number>, list: Sticker[] = stickers) {
  return list.filter((sticker) => getTradableCount(quantities, sticker.code) > 0).map((sticker) => sticker.code);
}

export function getStats(quantities: Record<string, number>, list: Sticker[] = stickers): CollectionStats {
  let owned = 0;
  let duplicateStickers = 0;
  let duplicates = 0;

  for (const sticker of list) {
    const quantity = getQuantity(quantities, sticker.code);
    if (quantity > 0) owned += 1;
    if (quantity > 1) {
      duplicateStickers += 1;
      duplicates += quantity - 1;
    }
  }

  const total = list.length;
  const missing = total - owned;
  const completion = total ? (owned / total) * 100 : 0;

  return {
    total,
    owned,
    missing,
    duplicateStickers,
    duplicates,
    completion
  };
}

export function filterStickers(
  list: Sticker[],
  quantities: Record<string, number>,
  filter: StickerFilter,
  query: string
) {
  const normalizedQuery = normalize(query);

  return list.filter((sticker) => {
    const quantity = getQuantity(quantities, sticker.code);
    const matchesFilter =
      filter === "all" ||
      (filter === "owned" && quantity > 0) ||
      (filter === "missing" && quantity === 0) ||
      (filter === "duplicates" && quantity > 1);

    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;

    return normalize(`${sticker.code} ${sticker.name} ${sticker.team}`).includes(normalizedQuery);
  });
}

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function parseStickerCodes(input: string) {
  return input
    .toUpperCase()
    .split(/[^A-Z0-9-]+/g)
    .map((code) => code.trim())
    .filter(Boolean);
}

export function normalizeStickerCode(code: string) {
  const trimmed = code.trim();
  const specialSuffix = /s$/.test(trimmed);
  const upper = trimmed.toUpperCase();
  return specialSuffix ? `${upper.slice(0, -1)}s` : upper;
}

export function formatPercent(value: number) {
  return `${value.toFixed(value === 100 || value === 0 ? 0 : 2)}%`;
}
