import type { TranslationKey } from "@/lib/i18n";

export type TradesMessageType = "missing" | "duplicates" | "both";

export const WHATSAPP_PREVIEW_CHAR_LIMIT = 220;

export function buildTradesWhatsAppMessage({
  messageType,
  missingCodes,
  duplicateLines,
  t
}: {
  messageType: TradesMessageType;
  missingCodes: string[];
  duplicateLines: string[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const missingLine = missingCodes.join(", ") || "-";
  const duplicateLine = duplicateLines.join(", ") || "-";

  if (messageType === "missing") {
    return t("trades.messageMissing", { missing: missingLine });
  }
  if (messageType === "duplicates") {
    return t("trades.messageDuplicates", { duplicates: duplicateLine });
  }
  return t("trades.messageBoth", { missing: missingLine, duplicates: duplicateLine });
}

/** UI-only preview. Copy/share/WhatsApp must use the full message. */
export function buildTradesWhatsAppPreview(message: string, showFull: boolean) {
  if (showFull || message.length <= WHATSAPP_PREVIEW_CHAR_LIMIT) {
    return message;
  }
  return `${message.slice(0, WHATSAPP_PREVIEW_CHAR_LIMIT).trim()}…`;
}
