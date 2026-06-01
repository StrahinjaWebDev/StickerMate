"use client";

import Link from "next/link";
import { Check, Copy, Minus, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import type { Sticker } from "@/types/sticker";

export type PaintMode = "owned" | "missing" | "duplicate";

export function StickerRow({
  sticker,
  quantity,
  selected,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onToggleSelected,
  onPaintStart
}: {
  sticker: Sticker;
  quantity: number;
  selected: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onSetQuantity: (quantity: number) => void;
  onToggleSelected: () => void;
  onPaintStart: (mode: PaintMode, code: string) => void;
}) {
  const status = quantity === 0 ? "Missing" : quantity === 1 ? "Owned" : `${quantity} total`;

  return (
    <div
      data-sticker-code={sticker.code}
      className={clsx(
        "grid h-[122px] grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border bg-white px-3 shadow-sm dark:bg-neutral-900 sm:h-[82px]",
        selected ? "border-pitch ring-2 ring-pitch/20" : "border-line dark:border-white/10"
      )}
    >
      <button
        type="button"
        className={clsx(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-sm font-black",
          selected
            ? "border-pitch bg-pitch text-white"
            : "border-line bg-field text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300"
        )}
        onClick={onToggleSelected}
        aria-label={`Select ${sticker.code}`}
      >
        {selected ? <Check size={19} /> : sticker.code.slice(0, 2)}
      </button>

      <Link href={`/sticker/${encodeURIComponent(sticker.code)}`} className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-xs font-black text-ink dark:bg-neutral-800 dark:text-white">
            {sticker.code}
          </span>
          <span
            className={clsx(
              "hidden rounded-md px-2 py-1 text-xs font-black min-[390px]:inline-flex",
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
        <p className="mt-1 truncate text-sm font-black text-ink dark:text-white">{sticker.name}</p>
        <p className="truncate text-xs font-bold text-neutral-500 dark:text-neutral-400">{sticker.team}</p>
      </Link>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-field text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200"
          onClick={onDecrement}
          aria-label={`Decrease ${sticker.code}`}
        >
          <Minus size={18} />
        </button>
        <span className="grid h-10 w-9 place-items-center text-base font-black text-ink dark:text-white">
          {quantity}
        </span>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg bg-pitch text-white"
          onClick={onIncrement}
          aria-label={`Increase ${sticker.code}`}
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="col-span-3 -mt-1 flex gap-1 sm:col-span-1 sm:col-start-3 sm:mt-0 sm:hidden">
        <PaintButton label="Have" icon={<Check size={16} />} onPointerDown={() => onPaintStart("owned", sticker.code)} />
        <PaintButton label="Miss" icon={<X size={16} />} onPointerDown={() => onPaintStart("missing", sticker.code)} />
        <PaintButton label="Dupe" icon={<Copy size={16} />} onPointerDown={() => onPaintStart("duplicate", sticker.code)} />
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
      className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-neutral-100 text-xs font-black text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      onPointerDown={onPointerDown}
    >
      {icon}
      {label}
    </button>
  );
}
