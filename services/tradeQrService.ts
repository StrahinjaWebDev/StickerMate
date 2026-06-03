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
    name: name.trim() || "StickerMate",
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
