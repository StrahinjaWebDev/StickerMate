import type { TranslationKey } from "@/lib/i18n";
import { getTradeMatch } from "@/services/tradeQrService";
import type { TradeFriend } from "@/types/sticker";

export const FRIEND_LIST_PREVIEW_LIMIT = 5;

export const FRIEND_LIST_TYPES = ["duplicates", "missing", "i-can-give", "friend-can-give"] as const;

export type FriendListType = (typeof FRIEND_LIST_TYPES)[number];

const titleKeys: Record<FriendListType, TranslationKey> = {
  duplicates: "friendDetail.friendDuplicates",
  missing: "friendDetail.friendMissing",
  "i-can-give": "friendDetail.iCanGive",
  "friend-can-give": "friendDetail.friendCanGiveMe"
};

export function isFriendListType(value: string): value is FriendListType {
  return FRIEND_LIST_TYPES.includes(value as FriendListType);
}

export function getFriendListTitleKey(type: FriendListType): TranslationKey {
  return titleKeys[type];
}

export function resolveFriendListCodes(
  type: FriendListType,
  friend: TradeFriend,
  quantities: Record<string, number>
): string[] {
  const match = getTradeMatch(quantities, friend);

  switch (type) {
    case "duplicates":
      return friend.duplicates;
    case "missing":
      return friend.missing;
    case "i-can-give":
      return match.iCanGive;
    case "friend-can-give":
      return match.friendCanGive;
  }
}

export function friendListHref(friendId: string, type: FriendListType) {
  return `/friends/${encodeURIComponent(friendId)}/${type}`;
}
