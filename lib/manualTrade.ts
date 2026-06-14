import type { TranslationKey } from "@/lib/i18n";
import { parseStickerCodes, stickerByCode } from "@/lib/stickers";

export function countStickerCodes(codes: string[]) {
  const counts = new Map<string, number>();
  for (const code of codes) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}

export function codesToTradeText(codes: string[]) {
  return codes.join(" ");
}

export function buildManualTradeProposalMessage(
  given: string[],
  received: string[],
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  return t("trades.manualProposalMessage", {
    give: given.length > 0 ? given.join(", ") : "-",
    need: received.length > 0 ? received.join(", ") : "-"
  });
}

export type ManualTradeValidationResult = {
  given: string[];
  received: string[];
  invalidGiven: string[];
  invalidReceived: string[];
  insufficientGiven: Array<{ code: string; requested: number; available: number }>;
  albumCopyWarnings: string[];
};

export function validateManualTradeCodes(
  given: string[],
  received: string[],
  quantities: Record<string, number>
): ManualTradeValidationResult {
  const invalidGiven = Array.from(new Set(given.filter((code) => !stickerByCode.has(code))));
  const invalidReceived = Array.from(new Set(received.filter((code) => !stickerByCode.has(code))));
  const validGiven = given.filter((code) => stickerByCode.has(code));
  const validReceived = received.filter((code) => stickerByCode.has(code));

  const givenCounts = countStickerCodes(validGiven);
  const insufficientGiven: ManualTradeValidationResult["insufficientGiven"] = [];
  const albumCopyWarnings: string[] = [];

  for (const [code, requested] of givenCounts) {
    const owned = quantities[code] ?? 0;
    if (requested > owned) {
      insufficientGiven.push({ code, requested, available: owned });
      continue;
    }

    if (owned - requested === 0) {
      albumCopyWarnings.push(code);
    }
  }

  return {
    given: validGiven,
    received: validReceived,
    invalidGiven,
    invalidReceived,
    insufficientGiven,
    albumCopyWarnings: Array.from(new Set(albumCopyWarnings))
  };
}

export function validateManualTradeInput(
  giveText: string,
  receiveText: string,
  quantities: Record<string, number>
): ManualTradeValidationResult {
  return validateManualTradeCodes(parseStickerCodes(giveText), parseStickerCodes(receiveText), quantities);
}
