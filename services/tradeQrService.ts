import type { TranslationKey } from "@/lib/i18n";
import { getQuantity, stickers } from "@/lib/stickers";
import { validateStickerCodes } from "@/services/stickerCodeService";
import type { TradeFriend, TradeProfilePayload } from "@/types/sticker";

const compactPrefix = "SMQR2";
const stickerIndexByCode = new Map(stickers.map((sticker, index) => [sticker.code, index]));

export function buildTradeProfilePayload(name: string, quantities: Record<string, number>): TradeProfilePayload {
  return {
    app: "StickerMate",
    type: "trade-profile",
    schemaVersion: 1,
    name: name.trim().slice(0, 64) || "StickerMate",
    missing: stickers.filter((sticker) => getQuantity(quantities, sticker.code) === 0).map((sticker) => sticker.code),
    duplicates: stickers.filter((sticker) => getQuantity(quantities, sticker.code) > 1).map((sticker) => sticker.code),
    generatedAt: new Date().toISOString()
  };
}

export function buildTradeQrLink(compactPayload: string, origin: string) {
  return `${origin}/friend-qr?data=${encodeURIComponent(compactPayload)}`;
}

export function parseTradeProfilePayload(input: string): TradeProfilePayload {
  const normalized = normalizeTradeProfileInput(input);
  if (!normalized.startsWith(`${compactPrefix}:`) && normalized.length > 8192) {
    throw new Error("Invalid StickerMate trade QR payload.");
  }
  const parsed = normalized.startsWith(`${compactPrefix}:`)
    ? decodeCompactTradeProfile(normalized)
    : (JSON.parse(normalized) as Partial<TradeProfilePayload>);

  if (
    parsed.app !== "StickerMate" ||
    parsed.type !== "trade-profile" ||
    parsed.schemaVersion !== 1 ||
    !Array.isArray(parsed.missing) ||
    !Array.isArray(parsed.duplicates)
  ) {
    throw new Error("Invalid StickerMate trade QR payload.");
  }

  const missing = validateStickerCodes(parsed.missing).validCodes;
  const duplicates = validateStickerCodes(parsed.duplicates).validCodes;

  return {
    app: "StickerMate",
    type: "trade-profile",
    schemaVersion: 1,
    name: String(parsed.name || "Friend").trim() || "Friend",
    missing,
    duplicates,
    generatedAt: parsed.generatedAt || new Date().toISOString()
  };
}

export async function encodeTradeProfileForQr(payload: TradeProfilePayload) {
  return [
    compactPrefix,
    encodeURIComponent(payload.name),
    encodeURIComponent(payload.generatedAt),
    encodeBitset(payload.missing),
    encodeBitset(payload.duplicates)
  ].join(":");
}

type JsQrDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" }
) => { data: string } | null;

export class QrImageNotFoundError extends Error {
  constructor() {
    super("QR not found in image");
    this.name = "QrImageNotFoundError";
  }
}

export async function readQrFromImageFile(file: File) {
  if (!isSupportedQrImageFile(file)) {
    throw new QrImageNotFoundError();
  }

  const jsQR = (await import("jsqr")).default as JsQrDecoder;
  const bitmap = await createImageBitmap(file);
  try {
    const data = decodeQrFromBitmap(jsQR, bitmap);
    if (!data) throw new QrImageNotFoundError();
    return data;
  } finally {
    bitmap.close();
  }
}

function isSupportedQrImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp)$/i.test(file.name);
}

export async function decodeQrFromVideoFrame(video: HTMLVideoElement) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  const jsQR = (await import("jsqr")).default as JsQrDecoder;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(image.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

function decodeQrFromBitmap(jsQR: JsQrDecoder, bitmap: ImageBitmap) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const scales = [1, 0.7, 0.5];
  const maxDim = 1400;

  for (const scale of scales) {
    let width = Math.max(120, Math.floor(bitmap.width * scale));
    let height = Math.max(120, Math.floor(bitmap.height * scale));
    if (Math.max(width, height) > maxDim) {
      const ratio = maxDim / Math.max(width, height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(bitmap, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const code = jsQR(image.data, width, height, { inversionAttempts: "attemptBoth" });
    if (code?.data) return code.data;
  }

  return null;
}

export function getTradeMatch(quantities: Record<string, number>, friend: Pick<TradeFriend, "missing" | "duplicates">) {
  const friendMissing = new Set(friend.missing);
  const friendDuplicates = new Set(friend.duplicates);

  return {
    iCanGive: stickers
      .filter((sticker) => getQuantity(quantities, sticker.code) > 1 && friendMissing.has(sticker.code))
      .map((sticker) => sticker.code),
    friendCanGive: stickers
      .filter((sticker) => getQuantity(quantities, sticker.code) === 0 && friendDuplicates.has(sticker.code))
      .map((sticker) => sticker.code)
  };
}

export function buildFriendTradeMessage(
  friendName: string,
  iCanGive: string[],
  friendCanGive: string[],
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  void friendName;
  return t("friendDetail.tradeMessage", {
    give: iCanGive.length > 0 ? iCanGive.join(", ") : "-",
    need: friendCanGive.length > 0 ? friendCanGive.join(", ") : "-"
  });
}

function encodeBitset(codes: string[]) {
  const bytes = new Uint8Array(Math.ceil(stickers.length / 8));
  for (const code of codes) {
    const index = stickerIndexByCode.get(code);
    if (index === undefined) continue;
    bytes[Math.floor(index / 8)] |= 1 << (index % 8);
  }
  return bytesToBase64Url(bytes);
}

function decodeBitset(value: string) {
  const bytes = base64UrlToBytes(value);
  return stickers
    .filter((_, index) => Boolean(bytes[Math.floor(index / 8)] & (1 << (index % 8))))
    .map((sticker) => sticker.code);
}

function normalizeTradeProfileInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Empty StickerMate trade QR payload.");
  }

  if (trimmed.includes("data=")) {
    try {
      const url = new URL(trimmed, "https://stickermate.local");
      const data = url.searchParams.get("data");
      if (data) return data;
    } catch {
      // Fall through to manual extraction.
    }

    const match = trimmed.match(/[?&]data=([^&#]+)/);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }

  return trimmed;
}

function decodeCompactTradeProfile(input: string): Partial<TradeProfilePayload> {
  const [, name, generatedAt, missing, duplicates] = input.split(":");
  if (!name || !generatedAt || !missing || !duplicates) {
    throw new Error("Invalid compact StickerMate trade QR payload.");
  }

  return {
    app: "StickerMate",
    type: "trade-profile",
    schemaVersion: 1,
    name: decodeURIComponent(name),
    missing: decodeBitset(missing),
    duplicates: decodeBitset(duplicates),
    generatedAt: decodeURIComponent(generatedAt)
  };
}

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
  return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
