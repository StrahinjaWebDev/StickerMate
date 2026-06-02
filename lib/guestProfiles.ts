"use client";

import { albumId, getLocalSnapshot, saveLocalSnapshot, type CloudSnapshot } from "@/lib/cloudSync";
import type { LanguageCode } from "@/types/sticker";

export type GuestProfile = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type GuestProfilesState = {
  activeId: string;
  profiles: GuestProfile[];
};

const META_KEY = "stickermate-guest-profiles";
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

function createId() {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatGuestProfileName(name: string, language: LanguageCode) {
  const match = /^(?:Guest|Gost) (\d+)$/i.exec(name.trim());
  if (!match) return name;
  return `${language === "sr" ? "Gost" : "Guest"} ${match[1]}`;
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
      packPriceRsd: 150,
      stickersPerPack: 7,
      tradeDisplayName: "",
      friends: [],
      recentCodes: [],
      entryHistory: [],
      reviewCurrentIndex: 0,
      reviewCompleted: false
    },
    onboarded: false,
    dismissedGuides: {},
    tradeHistory: [],
    spendingEntries: [],
    updatedAt: nowIso()
  };
}

function readMeta(): GuestProfilesState | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestProfilesState>;
    if (!parsed.activeId || !Array.isArray(parsed.profiles) || parsed.profiles.length === 0) return null;
    return {
      activeId: parsed.activeId,
      profiles: parsed.profiles.filter((profile): profile is GuestProfile => {
        return Boolean(profile?.id && profile.name && profile.createdAt && profile.updatedAt);
      })
    };
  } catch {
    return null;
  }
}

function writeMeta(state: GuestProfilesState) {
  window.localStorage.setItem(META_KEY, JSON.stringify(state));
}

function writeSnapshot(profileId: string, snapshot: CloudSnapshot) {
  window.localStorage.setItem(profileKey(profileId), JSON.stringify({ ...snapshot, updatedAt: nowIso() }));
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

export function ensureGuestProfiles(language: LanguageCode): GuestProfilesState {
  if (!isBrowser()) {
    const id = createId();
    return {
      activeId: id,
      profiles: [{ id, name: "Guest 1", createdAt: nowIso(), updatedAt: nowIso() }]
    };
  }

  const existing = readMeta();
  if (existing?.profiles.length) {
    if (!existing.profiles.some((profile) => profile.id === existing.activeId)) {
      const repaired = { ...existing, activeId: existing.profiles[0].id };
      writeMeta(repaired);
      return repaired;
    }
    return existing;
  }

  const id = createId();
  const now = nowIso();
  const initial = {
    activeId: id,
    profiles: [{ id, name: `${language === "sr" ? "Gost" : "Guest"} 1`, createdAt: now, updatedAt: now }]
  };

  writeMeta(initial);
  writeSnapshot(id, getLocalSnapshot());
  return initial;
}

export function getGuestProfilesState(language: LanguageCode) {
  return ensureGuestProfiles(language);
}

export function saveActiveGuestSnapshot(snapshot = getLocalSnapshot()) {
  if (!isBrowser()) return;
  const state = readMeta();
  if (!state) return;
  writeSnapshot(state.activeId, snapshot);
  writeMeta({
    ...state,
    profiles: state.profiles.map((profile) =>
      profile.id === state.activeId ? { ...profile, updatedAt: snapshot.updatedAt ?? nowIso() } : profile
    )
  });
}

export function loadGuestProfile(profileId: string, language: LanguageCode) {
  if (!isBrowser()) return ensureGuestProfiles(language);
  const state = ensureGuestProfiles(language);
  const profile = state.profiles.find((item) => item.id === profileId);
  if (!profile) return state;

  saveActiveGuestSnapshot();
  const nextState = { ...state, activeId: profileId };
  writeMeta(nextState);
  saveLocalSnapshot(readSnapshot(profileId) ?? emptySnapshot(language));
  return nextState;
}

export function createGuestProfile(language: LanguageCode) {
  const state = ensureGuestProfiles(language);
  saveActiveGuestSnapshot();
  const now = nowIso();
  const profile: GuestProfile = {
    id: createId(),
    name: `${language === "sr" ? "Gost" : "Guest"} ${state.profiles.length + 1}`,
    createdAt: now,
    updatedAt: now
  };
  const nextState = { activeId: profile.id, profiles: [...state.profiles, profile] };
  writeMeta(nextState);
  writeSnapshot(profile.id, emptySnapshot(language));
  saveLocalSnapshot(emptySnapshot(language));
  return nextState;
}

export function renameGuestProfile(profileId: string, name: string, language: LanguageCode) {
  const state = ensureGuestProfiles(language);
  const trimmed = name.trim();
  if (!trimmed) return state;
  const nextState = {
    ...state,
    profiles: state.profiles.map((profile) =>
      profile.id === profileId ? { ...profile, name: trimmed, updatedAt: nowIso() } : profile
    )
  };
  writeMeta(nextState);
  return nextState;
}

export function deleteGuestProfile(profileId: string, language: LanguageCode) {
  const state = ensureGuestProfiles(language);
  if (state.profiles.length <= 1) return state;

  const nextProfiles = state.profiles.filter((profile) => profile.id !== profileId);
  const nextActiveId = state.activeId === profileId ? nextProfiles[0].id : state.activeId;
  const nextState = { activeId: nextActiveId, profiles: nextProfiles };

  window.localStorage.removeItem(profileKey(profileId));
  writeMeta(nextState);

  if (state.activeId === profileId) {
    saveLocalSnapshot(readSnapshot(nextActiveId) ?? emptySnapshot(language));
  }

  return nextState;
}
