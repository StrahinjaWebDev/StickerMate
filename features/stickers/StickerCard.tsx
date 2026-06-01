"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { clsx } from "clsx";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import type { Sticker } from "@/types/sticker";

export function StickerCard({
  sticker,
  quantity,
  onIncrement,
  onDecrement
}: {
  sticker: Sticker;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const { t } = useI18n();
  const status = quantity === 0 ? t("status.missingCard") : quantity === 1 ? t("status.ownedCard") : `x${quantity}`;

  return (
    <article
      data-sticker-code={sticker.code}
      className={clsx(
        "rounded-lg border bg-white p-2 shadow-sm dark:bg-neutral-900",
        quantity === 0 ? "border-line dark:border-white/10" : "border-pitch/40"
      )}
    >
      <Link href={`/sticker/${encodeURIComponent(sticker.code)}`} className="block">
        <div className="relative">
          <StickerImage
            sticker={sticker}
            quantity={quantity}
            className="aspect-[3/4] w-full"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 180px"
          />
          <span
            className={clsx(
              "absolute bottom-2 left-2 rounded-md px-2 py-1 text-[11px] font-black",
              quantity === 0
                ? "bg-neutral-950/75 text-white"
                : quantity === 1
                  ? "bg-pitch text-white"
                  : "bg-gold text-ink"
            )}
          >
            {status}
          </span>
        </div>
        <div className="mt-2 min-w-0">
          <p className="truncate text-xs font-black text-ink dark:text-white">{sticker.code}</p>
          <p className="truncate text-sm font-black text-ink dark:text-white">{sticker.name}</p>
          <p className="truncate text-xs font-semibold text-neutral-500 dark:text-neutral-400">{sticker.team}</p>
        </div>
      </Link>

      <div className="mt-2 grid grid-cols-[40px_1fr_40px] items-center gap-1">
        <button
          type="button"
          className="grid h-10 place-items-center rounded-md border border-line bg-field text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200"
          onClick={onDecrement}
          aria-label={t("sticker.decrease", { code: sticker.code })}
        >
          <Minus size={17} />
        </button>
        <span className="text-center text-sm font-black text-ink dark:text-white">{quantity}</span>
        <button
          type="button"
          className="grid h-10 place-items-center rounded-md bg-pitch text-white"
          onClick={onIncrement}
          aria-label={t("sticker.increase", { code: sticker.code })}
        >
          <Plus size={17} />
        </button>
      </div>
    </article>
  );
}
