import type { LanguageCode, SpendingCurrency, SpendingEntry } from "@/types/sticker";

export const spendingCurrencies: SpendingCurrency[] = ["RSD"];
export const defaultPackPriceRsd = 150;
export const defaultStickersPerPack = 7;
export const rsdPerEur = 117;

export function calculatePackSpending(packsCount: number, packPrice = defaultPackPriceRsd) {
  return Math.max(0, Math.floor(packsCount)) * packPrice;
}

export function calculatePackStickers(packsCount: number, stickersPerPack = defaultStickersPerPack) {
  return Math.max(0, Math.floor(packsCount)) * stickersPerPack;
}

export function convertRsdToEur(amountRsd: number) {
  return amountRsd / rsdPerEur;
}

export function formatMoney(amountRsd: number, language: LanguageCode) {
  if (language === "en") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertRsdToEur(amountRsd));
  }

  const formatted = new Intl.NumberFormat("sr-RS", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amountRsd));

  return `${formatted} RSD`;
}

export function getEntryAmountRsd(entry: SpendingEntry) {
  if (entry.currency === "EUR") return entry.amount * rsdPerEur;
  return entry.amount;
}

export function getSpendingStats(entries: SpendingEntry[], ownedStickerCount: number) {
  const totalSpentRsd = entries.reduce((sum, entry) => sum + getEntryAmountRsd(entry), 0);
  const totalPacks = entries.reduce((sum, entry) => sum + (entry.packsCount ?? 0), 0);
  const totalStickers = entries.reduce((sum, entry) => sum + (entry.stickersCount ?? 0), 0);

  return {
    totalSpentRsd,
    entryCount: entries.length,
    totalPacks,
    totalStickers,
    averagePackPriceRsd: totalPacks > 0 ? totalSpentRsd / totalPacks : 0,
    costPerOwnedStickerRsd: ownedStickerCount > 0 ? totalSpentRsd / ownedStickerCount : 0
  };
}
