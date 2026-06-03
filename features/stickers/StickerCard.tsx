"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { clsx } from "clsx";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import { getDuplicateCount } from "@/lib/stickers";
import { formatDuplicateLabel } from "@/lib/duplicateLabel";
import { getTeamIcon } from "@/lib/teamIcons";
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
  const duplicateCount = getDuplicateCount({ [sticker.code]: quantity }, sticker.code);
  const status =
    quantity === 0
      ? t("status.missingCard")
      : quantity === 1
        ? t("status.ownedCard")
        : formatDuplicateLabel(t, duplicateCount);

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
          <span className="absolute left-1.5 top-1.5 z-[3] rounded bg-neutral-950/80 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
            {sticker.code}
          </span>
          <span
            className={clsx(
              "absolute bottom-1.5 left-1.5 z-[3] rounded-md px-1.5 py-0.5 text-[10px] font-black leading-none",
              quantity === 0
                ? "bg-neutral-950/80 text-white"
                : quantity === 1
                  ? "bg-pitch text-white"
                  : "bg-gold text-ink"
            )}
          >
            {status}
          </span>
        </div>
        <div className="mt-2 min-w-0">
          <p className="truncate text-sm font-black text-ink dark:text-white">{sticker.name}</p>
          <p className="truncate text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <span className="mr-1">{getTeamIcon(sticker.team)}</span>
            {sticker.team}
          </p>
        </div>
      </Link>

      <div className="mt-2 grid grid-cols-[36px_1fr_36px] items-center gap-1">
        <button
          type="button"
          className="grid h-9 place-items-center rounded-md border border-line bg-field text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200"
          onClick={onDecrement}
          aria-label={t("sticker.decrease", { code: sticker.code })}
        >
          <Minus size={16} />
        </button>
        <span className="text-center text-sm font-black text-ink dark:text-white">{quantity}</span>
        <button
          type="button"
          className="grid h-9 place-items-center rounded-md bg-pitch text-white"
          onClick={onIncrement}
          aria-label={t("sticker.increase", { code: sticker.code })}
        >
          <Plus size={16} />
        </button>
      </div>
    </article>
  );
}
