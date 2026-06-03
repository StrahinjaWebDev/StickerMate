"use client";

import { albumId, getLocalSnapshot, saveLocalSnapshot, type CloudSnapshot } from "@/lib/cloudSync";
import { generateGuestName } from "@/lib/guestNames";
import { PACK_PRICE_RSD, STICKERS_PER_PACK } from "@/lib/spending";
import type { LanguageCode } from "@/types/sticker";

export type GuestIdentity = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type LegacyGuestProfile = GuestIdentity;

type LegacyGuestProfilesState = {
  activeId: string;
  profiles: LegacyGuestProfile[];
};

const IDENTITY_KEY = "stickermate-local-guest";
const MIGRATION_KEY = "stickermate-local-guest-migrated";
const LEGACY_META_KEY = "stickermate-guest-profiles";
const PROFILE_KEY_PREFIX = "stickermate-guest-profile:";

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function profileKey(id: string) {
  return `${PROFILE_KEY_PREFIX}${id}`;
}

function createGuestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `guest_${crypto.randomUUID()}`;
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptySnapshot(language: LanguageCode): CloudSnapshot {
  return {
    albumId,
    quantities: {},
    settings: {
      theme: "system",
      language,
      viewMode: "list",
      defaultCurrency: "RSD",
      packPriceRsd: PACK_PRICE_RSD,
      stickersPerPack: STICKERS_PER_PACK,
      tradeDisplayName: "",
      friends: [],
      recentCodes: [],
      entryHistory: []
    },
    reviewState: {
      currentIndex: 0,
      completed: false
    },
    onboarded: false,
    dismissedGuides: {},
    tradeHistory: [],
    spendingEntries: [],
    updatedAt: nowIso()
  };
}

function readIdentity(): GuestIdentity | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestIdentity>;
    if (!parsed.id || !parsed.name || !parsed.createdAt || !parsed.updatedAt) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt
    };
  } catch {
    return null;
  }
}

function writeIdentity(identity: GuestIdentity) {
  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

function readSnapshot(profileId: string) {
  try {
    const raw = window.localStorage.getItem(profileKey(profileId));
    if (!raw) return null;
    return JSON.parse(raw) as CloudSnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(profileId: string, snapshot: CloudSnapshot) {
  window.localStorage.setItem(profileKey(profileId), JSON.stringify({ ...snapshot, updatedAt: nowIso() }));
}

function readLegacyActiveProfile() {
  try {
    const raw = window.localStorage.getItem(LEGACY_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LegacyGuestProfilesState>;
    if (!parsed.activeId || !Array.isArray(parsed.profiles)) return null;
    const active = parsed.profiles.find((profile) => profile.id === parsed.activeId);
    return active ? { active, snapshot: readSnapshot(active.id) } : null;
  } catch {
    return null;
  }
}

export function ensureGuestIdentity(): GuestIdentity {
  if (!isBrowser()) {
    const now = nowIso();
    return { id: createGuestId(), name: generateGuestName(), createdAt: now, updatedAt: now };
  }

  const existing = readIdentity();
  if (existing) return existing;

  const now = nowIso();
  const legacy = readLegacyActiveProfile();
  const identity = {
    id: createGuestId(),
    name: legacy?.active.name && !/^(?:Guest|Gost) \d+$/i.test(legacy.active.name) ? legacy.active.name : generateGuestName(),
    createdAt: now,
    updatedAt: now
  };

  writeIdentity(identity);
  writeSnapshot(identity.id, legacy?.snapshot ?? getLocalSnapshot());
  return identity;
}

export function hydrateGuestSnapshot(language: LanguageCode) {
  if (!isBrowser()) return ensureGuestIdentity();
  const identity = ensureGuestIdentity();
  const migrated = window.localStorage.getItem(MIGRATION_KEY);
  const snapshot = readSnapshot(identity.id);

  if (!migrated && snapshot) {
    saveLocalSnapshot(snapshot);
    window.localStorage.setItem(MIGRATION_KEY, "true");
    return identity;
  }

  if (!snapshot) writeSnapshot(identity.id, getLocalSnapshot() ?? emptySnapshot(language));
  return identity;
}

export function getGuestIdentity() {
  return ensureGuestIdentity();
}

export function saveGuestSnapshot(snapshot = getLocalSnapshot()) {
  if (!isBrowser()) return;
  const identity = ensureGuestIdentity();
  writeSnapshot(identity.id, snapshot);
  writeIdentity({ ...identity, updatedAt: snapshot.updatedAt ?? nowIso() });
}
