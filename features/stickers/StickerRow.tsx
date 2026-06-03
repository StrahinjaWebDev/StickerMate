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

type StickerRowProps = {
  sticker: Sticker;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  variant?: "default" | "duplicates";
};

export function StickerRow({
  sticker,
  quantity,
  onIncrement,
  onDecrement,
  variant = "default"
}: StickerRowProps) {
  const { t } = useI18n();
  const duplicateCount = getDuplicateCount({ [sticker.code]: quantity }, sticker.code);
  const isDuplicateView = variant === "duplicates";

  if (isDuplicateView) {
    return (
      <DuplicateStickerRow
        sticker={sticker}
        quantity={quantity}
        duplicateCount={duplicateCount}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />
    );
  }

  const status =
    quantity === 0
      ? t("status.missing")
      : quantity === 1
        ? t("status.owned")
        : formatDuplicateLabel(t, duplicateCount);

  return (
    <div
      data-sticker-code={sticker.code}
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 overflow-visible rounded-lg border border-line bg-white p-2 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:gap-3 sm:p-2.5"
    >
      <Link
        href={`/sticker/${encodeURIComponent(sticker.code)}`}
        className="shrink-0 self-center"
        aria-label={t("sticker.open", { code: sticker.code })}
      >
        <StickerImage
          sticker={sticker}
          quantity={quantity}
          className="h-[68px] w-[51px] sm:h-[72px] sm:w-[54px]"
          showTextPlaceholder={false}
          sizes="58px"
        />
      </Link>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link
          href={`/sticker/${encodeURIComponent(sticker.code)}`}
          className="min-w-0 flex-1 overflow-hidden sm:max-w-md sm:flex-none"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-black leading-none text-ink dark:bg-neutral-800 dark:text-white">
              {sticker.code}
            </span>
            <span
              className={clsx(
                "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-black leading-none transition-colors duration-200",
                quantity === 0
                  ? "bg-coral/10 text-coral"
                  : quantity === 1
                    ? "bg-pitch/10 text-pitch"
                    : "bg-gold/20 text-yellow-700 dark:text-gold"
              )}
            >
              {status}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-sm font-black text-ink dark:text-white">{sticker.name}</p>
          <p className="line-clamp-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">
            <span className="mr-1">{getTeamIcon(sticker.team)}</span>
            {sticker.team}
          </p>
        </Link>

        <QuantityControls sticker={sticker} quantity={quantity} onIncrement={onIncrement} onDecrement={onDecrement} />
      </div>
    </div>
  );
}

function DuplicateStickerRow({
  sticker,
  quantity,
  duplicateCount,
  onIncrement,
  onDecrement
}: {
  sticker: Sticker;
  quantity: number;
  duplicateCount: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const { t } = useI18n();
  const duplicateLabel = formatDuplicateLabel(t, duplicateCount);

  return (
    <div
      data-sticker-code={sticker.code}
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 overflow-visible rounded-lg border border-line bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:gap-3 sm:p-3"
    >
      <Link
        href={`/sticker/${encodeURIComponent(sticker.code)}`}
        className="shrink-0 self-start"
        aria-label={t("sticker.open", { code: sticker.code })}
      >
        <StickerImage
          sticker={sticker}
          quantity={quantity}
          className="h-[68px] w-[51px] sm:h-[72px] sm:w-[54px]"
          showTextPlaceholder={false}
          sizes="58px"
        />
      </Link>

      <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-black leading-none text-ink dark:bg-neutral-800 dark:text-white">
              {sticker.code}
            </span>
            <span className="shrink-0 rounded bg-gold/20 px-2 py-0.5 text-[11px] font-black leading-none text-yellow-800 dark:text-gold">
              {duplicateLabel}
            </span>
          </div>
          <Link href={`/sticker/${encodeURIComponent(sticker.code)}`} className="min-w-0">
            <p className="line-clamp-2 text-sm font-black leading-snug text-ink dark:text-white">{sticker.name}</p>
            <p className="mt-0.5 line-clamp-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">
              <span className="mr-1">{getTeamIcon(sticker.team)}</span>
              {sticker.team}
            </p>
          </Link>
          <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">{t("duplicates.albumHint")}</p>
        </div>

        <QuantityControls
          sticker={sticker}
          quantity={quantity}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          compact={false}
        />
      </div>
    </div>
  );
}

function QuantityControls({
  sticker,
  quantity,
  onIncrement,
  onDecrement,
  compact = true
}: {
  sticker: Sticker;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const buttonClass = compact
    ? "grid h-9 w-9 shrink-0 place-items-center rounded-lg"
    : "grid h-10 w-10 shrink-0 place-items-center rounded-lg sm:h-11 sm:w-11";

  return (
    <div className="flex shrink-0 flex-row items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        className={clsx(
          buttonClass,
          "tap-scale border border-line bg-field text-neutral-700 motion-safe:active:scale-[0.95] dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200"
        )}
        onClick={onDecrement}
        aria-label={t("sticker.decrease", { code: sticker.code })}
      >
        <Minus size={compact ? 16 : 18} />
      </button>
      <span
        key={quantity}
        className={clsx(
          "grid min-w-[1.75rem] shrink-0 place-items-center tabular-nums font-black text-ink motion-safe:animate-qty-pop dark:text-white",
          compact ? "h-9 px-0.5 text-sm" : "h-10 min-w-[2rem] px-1 text-base sm:h-11 sm:min-w-[2.25rem]"
        )}
        aria-label={`${t("sticker.quantity")}: ${quantity}`}
      >
        {quantity}
      </span>
      <button
        type="button"
        className={clsx(buttonClass, "tap-scale bg-pitch text-white motion-safe:active:scale-[0.95]")}
        onClick={onIncrement}
        aria-label={t("sticker.increase", { code: sticker.code })}
      >
        <Plus size={compact ? 16 : 18} />
      </button>
    </div>
  );
}
