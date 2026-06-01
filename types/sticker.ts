export type Sticker = {
  code: string;
  name: string;
  team: string;
  imageCode?: string;
  imageUrl?: string;
  imageSource?: string;
};

export type StickerChecklist = {
  source: string;
  scrapedAt: string;
  edition: string;
  canonicalCount: number;
  cutoffRule: string;
  stickers: Sticker[];
};

export type StickerFilter = "all" | "owned" | "missing" | "duplicates";

export type StickerViewMode = "list" | "grid";

export type ThemePreference = "light" | "dark" | "system";

export type LanguageCode = "sr" | "en";

export type CollectionStats = {
  total: number;
  owned: number;
  missing: number;
  duplicateStickers: number;
  duplicates: number;
  completion: number;
};

export type ImportSummary = {
  imported: number;
  duplicates: number;
  invalid: number;
  uniqueImported: number;
  newCodes: string[];
  duplicateCodes: string[];
  invalidCodes: string[];
};
