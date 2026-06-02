"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { getSticker } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import type { Sticker } from "@/types/sticker";

export function RecentStickers() {
  const recentCodes = useCollectionStore((state) => state.recentCodes);
  const quantities = useCollectionStore((state) => state.quantities);
  const { t } = useI18n();
  const recent = recentCodes
    .map(getSticker)
    .filter((sticker): sticker is Sticker => Boolean(sticker))
    .slice(0, 8);

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink dark:text-white">{t("recent.title")}</h2>
        {recent.length > 0 ? (
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
            {t("recent.latest", { count: recent.length })}
          </span>
        ) : null}
      </div>
      {recent.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={Clock}
            title={t("empty.noRecent")}
            body={t("empty.noRecentBody")}
            actionLabel={t("empty.noRecentAction")}
            actionHref="/fill"
          />
        </div>
      ) : (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {recent.map((sticker) => (
            <Link
              key={sticker.code}
              href={`/sticker/${encodeURIComponent(sticker.code)}`}
              className="w-20 shrink-0"
              aria-label={t("sticker.open", { code: sticker.code })}
            >
              <StickerImage
                sticker={sticker}
                quantity={quantities[sticker.code] ?? 0}
                className="aspect-[3/4] w-full"
                showTextPlaceholder={false}
                sizes="80px"
              />
              <p className="mt-1 truncate text-center text-xs font-black text-ink dark:text-white">{sticker.code}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
