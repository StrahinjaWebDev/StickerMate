import type { LanguageCode, SpendingCurrency, SpendingEntry } from "@/types/sticker";

export const spendingCurrencies: SpendingCurrency[] = ["RSD", "EUR", "USD", "GBP"];
export const defaultPackPriceRsd = 150;
export const defaultStickersPerPack = 7;

export function calculatePackSpending(packsCount: number, packPrice = defaultPackPriceRsd) {
  return Math.max(0, Math.floor(packsCount)) * packPrice;
}

export function calculatePackStickers(packsCount: number, stickersPerPack = defaultStickersPerPack) {
  return Math.max(0, Math.floor(packsCount)) * stickersPerPack;
}

export function formatMoney(amount: number, currency: SpendingCurrency, language: LanguageCode) {
  const locale = language === "sr" ? "sr-RS" : "en-US";
  const hasDecimals = Math.abs(amount % 1) > 0;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  }).format(amount);

  return `${formatted} ${currency}`;
}

export function getSpendingStats(
  entries: SpendingEntry[],
  currency: SpendingCurrency,
  ownedStickerCount: number
) {
  const currencyEntries = entries.filter((entry) => entry.currency === currency);
  const totalSpent = currencyEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalPacks = currencyEntries.reduce((sum, entry) => sum + (entry.packsCount ?? 0), 0);
  const totalStickers = currencyEntries.reduce((sum, entry) => sum + (entry.stickersCount ?? 0), 0);

  return {
    currency,
    totalSpent,
    entryCount: entries.length,
    currencyEntryCount: currencyEntries.length,
    totalPacks,
    totalStickers,
    averagePackPrice: totalPacks > 0 ? totalSpent / totalPacks : 0,
    costPerOwnedSticker: ownedStickerCount > 0 ? totalSpent / ownedStickerCount : 0
  };
}
