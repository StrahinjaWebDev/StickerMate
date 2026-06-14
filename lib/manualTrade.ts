import { parseStickerCodes, stickerByCode } from "@/lib/stickers";

export function countStickerCodes(codes: string[]) {
  const counts = new Map<string, number>();
  for (const code of codes) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}

export type ManualTradeValidationResult = {
  given: string[];
  received: string[];
  invalidGiven: string[];
  invalidReceived: string[];
  insufficientGiven: Array<{ code: string; requested: number; available: number }>;
  albumCopyWarnings: string[];
};

export function validateManualTradeInput(
  giveText: string,
  receiveText: string,
  quantities: Record<string, number>
): ManualTradeValidationResult {
  const rawGiven = parseStickerCodes(giveText);
  const rawReceived = parseStickerCodes(receiveText);

  const invalidGiven = Array.from(new Set(rawGiven.filter((code) => !stickerByCode.has(code))));
  const invalidReceived = Array.from(new Set(rawReceived.filter((code) => !stickerByCode.has(code))));
  const given = rawGiven.filter((code) => stickerByCode.has(code));
  const received = rawReceived.filter((code) => stickerByCode.has(code));

  const givenCounts = countStickerCodes(given);
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
    given,
    received,
    invalidGiven,
    invalidReceived,
    insufficientGiven,
    albumCopyWarnings: Array.from(new Set(albumCopyWarnings))
  };
}
