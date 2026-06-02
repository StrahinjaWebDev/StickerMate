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

export type SpendingCurrency = "RSD" | "EUR" | "USD" | "GBP";

export type SpendingCategory = "packs" | "album" | "bundle" | "individual" | "other";

export type GuideKey =
  | "dashboard"
  | "collection"
  | "quickReview"
  | "teams"
  | "duplicates"
  | "trades"
  | "spending"
  | "scan"
  | "tradeQr"
  | "friendQr"
  | "settings";

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

export type EntryHistoryItem = {
  id: string;
  note: string;
  codes: string[];
  createdAt: string;
};

export type SpendingEntry = {
  id: string;
  date: string;
  amount: number;
  currency: SpendingCurrency;
  category: SpendingCategory;
  packsCount?: number;
  stickersCount?: number;
  note?: string;
  linkedEntryId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TradeHistoryItem = {
  id: string;
  date: string;
  friendName: string;
  stickersGiven: string[];
  stickersReceived: string[];
  note?: string;
  appliedToCollection: boolean;
  undoneAt?: string;
  createdAt: string;
};

export type TradeFriend = {
  id: string;
  name: string;
  missing: string[];
  duplicates: string[];
  notes?: string;
  importedAt: string;
};

export type TradeProfilePayload = {
  app: "StickerMate";
  type: "trade-profile";
  schemaVersion: 1;
  name: string;
  missing: string[];
  duplicates: string[];
  generatedAt: string;
};

export type RecognitionResult = {
  detectedCodes: string[];
  invalidCodes: string[];
  excludedCodes: string[];
  confidence?: number;
  rawText?: string;
  warnings?: string[];
};
