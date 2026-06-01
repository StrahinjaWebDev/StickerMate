import { getAnySticker, getSticker, normalizeStickerCode } from "@/lib/stickers";

export type CodeValidationResult = {
  validCodes: string[];
  invalidCodes: string[];
  excludedCodes: string[];
};

const stickerCodePattern = /\b(?:00|FWC\d{1,2}|[A-Za-z]{3}\d{1,2}s?)\b/g;

export function extractStickerCodeCandidates(text: string) {
  return Array.from(text.matchAll(stickerCodePattern), (match) => normalizeStickerCode(match[0]));
}

export function validateStickerCodes(codes: string[]): CodeValidationResult {
  const validCodes = new Set<string>();
  const invalidCodes = new Set<string>();
  const excludedCodes = new Set<string>();

  for (const code of codes) {
    const normalized = normalizeStickerCode(code);
    if (!normalized) continue;

    if (getSticker(normalized)) {
      validCodes.add(normalized);
    } else if (getAnySticker(normalized)) {
      excludedCodes.add(normalized);
    } else {
      invalidCodes.add(normalized);
    }
  }

  return {
    validCodes: Array.from(validCodes),
    invalidCodes: Array.from(invalidCodes),
    excludedCodes: Array.from(excludedCodes)
  };
}

export function codesToText(codes: string[]) {
  return codes.join("\n");
}
