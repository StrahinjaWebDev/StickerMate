import { extractStickerCodeCandidates, validateStickerCodes } from "@/services/stickerCodeService";
import type { RecognitionResult } from "@/types/sticker";

export async function recognizeStickerCodesFromImage(file: File): Promise<RecognitionResult> {
  try {
    const { recognize } = await import("tesseract.js");
    const result = await recognize(file, "eng");
    const rawText = result.data.text ?? "";
    const validation = validateStickerCodes(extractStickerCodeCandidates(rawText));

    return {
      detectedCodes: validation.validCodes,
      invalidCodes: validation.invalidCodes,
      excludedCodes: validation.excludedCodes,
      confidence: result.data.confidence,
      rawText,
      warnings:
        validation.validCodes.length === 0
          ? ["scan.manualReviewRecommended"]
          : undefined
    };
  } catch {
    return {
      detectedCodes: [],
      invalidCodes: [],
      excludedCodes: [],
      warnings: ["scan.ocrUnavailable"]
    };
  }
}
