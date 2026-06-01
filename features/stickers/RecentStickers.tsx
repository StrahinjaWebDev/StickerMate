"use client";

import Link from "next/link";
import { getSticker } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { StickerImage } from "@/features/stickers/StickerImage";

export function RecentStickers() {
  const recentCodes = useCollectionStore((state) => state.recentCodes);
  const quantities = useCollectionStore((state) => state.quantities);
  const recent = recentCodes.map(getSticker).filter(Boolean).slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink dark:text-white">Recently added</h2>
        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">{recent.length} latest</span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {recent.map((sticker) => (
          <Link
            key={sticker.code}
            href={`/sticker/${encodeURIComponent(sticker.code)}`}
            className="w-20 shrink-0"
            aria-label={`Open ${sticker.code}`}
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
    </section>
  );
}
