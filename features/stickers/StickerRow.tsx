"use client";

import Link from "next/link";
import { Check, Copy, Minus, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import { getDuplicateCount } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import type { Sticker } from "@/types/sticker";

export type PaintMode = "owned" | "missing" | "duplicate";

export function StickerRow({
  sticker,
  quantity,
  selected,
  onIncrement,
  onDecrement,
  onToggleSelected,
  onPaintStart
}: {
  sticker: Sticker;
  quantity: number;
  selected: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onToggleSelected: () => void;
  onPaintStart: (mode: PaintMode, code: string) => void;
}) {
  const { t } = useI18n();
  const duplicateCount = getDuplicateCount({ [sticker.code]: quantity }, sticker.code);
  const status =
    quantity === 0
      ? t("status.missing")
      : quantity === 1
        ? t("status.owned")
        : t(duplicateCount === 1 ? "status.duplicateOne" : "status.duplicateMany", { count: duplicateCount });

  return (
    <div
      data-sticker-code={sticker.code}
      className={clsx(
        "flex gap-2 rounded-lg border bg-white p-2 shadow-sm dark:bg-neutral-900 sm:gap-2.5 sm:p-2.5",
        selected ? "border-pitch ring-2 ring-pitch/20" : "border-line dark:border-white/10"
      )}
    >
      <button
        type="button"
        className={clsx(
          "grid h-9 w-9 shrink-0 place-items-center self-start rounded-lg border text-xs font-black",
          selected
            ? "border-pitch bg-pitch text-white"
            : "border-line bg-field text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300"
        )}
        onClick={onToggleSelected}
        aria-label={t("sticker.select", { code: sticker.code })}
      >
        {selected ? <Check size={17} /> : null}
      </button>

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

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link href={`/sticker/${encodeURIComponent(sticker.code)}`} className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-black leading-none text-ink dark:bg-neutral-800 dark:text-white">
              {sticker.code}
            </span>
            <span
              className={clsx(
                "rounded px-1.5 py-0.5 text-[11px] font-black leading-none",
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

        <div className="flex flex-wrap gap-1">
          <PaintButton label={t("bulk.owned")} icon={<Check size={14} />} onPointerDown={() => onPaintStart("owned", sticker.code)} />
          <PaintButton label={t("bulk.missing")} icon={<X size={14} />} onPointerDown={() => onPaintStart("missing", sticker.code)} />
          <PaintButton label={t("bulk.duplicate")} icon={<Copy size={14} />} onPointerDown={() => onPaintStart("duplicate", sticker.code)} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center self-center">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-field text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200"
          onClick={onDecrement}
          aria-label={t("sticker.decrease", { code: sticker.code })}
        >
          <Minus size={16} />
        </button>
        <span className="grid h-8 w-9 place-items-center text-sm font-black text-ink dark:text-white">{quantity}</span>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg bg-pitch text-white"
          onClick={onIncrement}
          aria-label={t("sticker.increase", { code: sticker.code })}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function PaintButton({
  label,
  icon,
  onPointerDown
}: {
  label: string;
  icon: React.ReactNode;
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md bg-neutral-100 px-2 text-[11px] font-black text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      onPointerDown={onPointerDown}
      aria-label={label}
    >
      {icon}
      <span className="hidden min-[420px]:inline">{label}</span>
    </button>
  );
}
