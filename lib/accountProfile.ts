import type { User } from "@supabase/supabase-js";

export type ProfileInfo = {
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  initials: string;
};

function getMetadataString(user: User, key: "full_name" | "name" | "avatar_url" | "picture") {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getInitials(name: string | null, email: string) {
  const source = name ?? email;
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || "U").toUpperCase();
}

function getSafeAvatarUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getProfileInfo(user: User): ProfileInfo {
  const email = user.email ?? "";
  const displayName = getMetadataString(user, "full_name") ?? getMetadataString(user, "name");
  const avatarUrl = getSafeAvatarUrl(getMetadataString(user, "avatar_url") ?? getMetadataString(user, "picture"));

  return {
    displayName,
    email,
    avatarUrl,
    initials: getInitials(displayName, email)
  };
}

export function getGuestInitials(name: string) {
  return getInitials(name, "guest");
}
