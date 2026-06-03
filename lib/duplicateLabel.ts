import type { TranslationKey } from "@/lib/i18n";

export type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Extra tradable copies after the one kept in the album (quantity - 1). */
export function getDuplicateLabelKey(count: number): TranslationKey | null {
  if (count <= 0) return null;
  return count === 1 ? "status.duplicateOne" : "status.duplicateMany";
}

export function formatDuplicateLabel(t: TranslateFn, count: number) {
  const key = getDuplicateLabelKey(count);
  if (!key) return "";
  return t(key, { count });
}

export function formatMyDuplicateBadge(t: TranslateFn, count: number) {
  const key = count === 1 ? "friendDetail.myDuplicateBadgeOne" : "friendDetail.myDuplicateBadgeMany";
  return t(key, { count });
}
