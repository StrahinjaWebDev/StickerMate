"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/lib/i18n";
import { getDuplicateCount, getTradableCount, normalize, stickers } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import type { Sticker } from "@/types/sticker";

export type ManualTradePickerFilter = "all" | "duplicates" | "missing";
export type ManualTradePickerTarget = "give" | "receive";

const RESULT_LIMIT = 40;

export function ManualTradeStickerPicker({
  filter,
  onClose,
  onSelect,
  open,
  quantities,
  target,
  onTargetChange
}: {
  filter: ManualTradePickerFilter;
  onClose: () => void;
  onSelect: (code: string) => void;
  open: boolean;
  quantities: Record<string, number>;
  target: ManualTradePickerTarget;
  onTargetChange: (target: ManualTradePickerTarget) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const normalizedQuery = normalize(query);
    return stickers
      .filter((sticker) => {
        const quantity = quantities[sticker.code] ?? 0;
        if (filter === "duplicates" && getTradableCount(quantities, sticker.code) <= 0) return false;
        if (filter === "missing" && quantity > 0) return false;
        if (!normalizedQuery) return true;
        return normalize(`${sticker.code} ${sticker.name} ${sticker.team}`).includes(normalizedQuery);
      })
      .slice(0, RESULT_LIMIT);
  }, [filter, quantities, query]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overscroll-contain bg-ink/50 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-trade-picker-title"
        tabIndex={-1}
        className="animate-status-in flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-white shadow-lift outline-none dark:border-white/10 dark:bg-neutral-900 sm:max-h-[min(85dvh,720px)] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-4 dark:border-white/10">
          <div>
            <h2 id="manual-trade-picker-title" className="text-lg font-black text-ink dark:text-white">
              {t("trades.pickerTitle")}
            </h2>
            <p className="mt-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">{t(getFilterHintKey(filter))}</p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-field text-ink dark:bg-neutral-950 dark:text-white"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-line p-4 dark:border-white/10">
          <div className="flex gap-2">
            {(["give", "receive"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={
                  target === option
                    ? "min-h-10 flex-1 rounded-lg bg-pitch px-3 text-sm font-black text-white"
                    : "min-h-10 flex-1 rounded-lg border border-line bg-field px-3 text-sm font-black text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300"
                }
                onClick={() => onTargetChange(option)}
              >
                {option === "give" ? t("trades.iGive") : t("trades.iReceive")}
              </button>
            ))}
          </div>
          <label className="relative mt-3 block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search.label")}
              className="w-full rounded-lg border-line bg-field py-2.5 pl-9 pr-3 text-sm font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="p-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("trades.pickerEmpty")}</p>
          ) : (
            <ul className="space-y-1">
              {results.map((sticker) => (
                <PickerRow
                  key={sticker.code}
                  quantities={quantities}
                  sticker={sticker}
                  target={target}
                  t={t}
                  onSelect={() => onSelect(sticker.code)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-white/10">
          <Button className="w-full" onClick={onClose}>
            {t("common.done")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PickerRow({
  onSelect,
  quantities,
  sticker,
  t,
  target
}: {
  onSelect: () => void;
  quantities: Record<string, number>;
  sticker: Sticker;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  target: ManualTradePickerTarget;
}) {
  const quantity = quantities[sticker.code] ?? 0;
  const duplicateCount = getDuplicateCount(quantities, sticker.code);

  return (
    <li>
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-2.5 rounded-lg bg-field p-2 text-left transition hover:bg-pitch/10 dark:bg-neutral-950 dark:hover:bg-pitch/10"
        onClick={onSelect}
      >
        <StickerImage
          sticker={sticker}
          quantity={quantity}
          className="h-12 w-9 shrink-0"
          showTextPlaceholder={false}
          sizes="36px"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-ink dark:text-white">
            <span className="text-neutral-500 dark:text-neutral-400">{sticker.code}</span> {sticker.name}
          </p>
          <p className="truncate text-xs font-bold text-neutral-500 dark:text-neutral-400">
            <span className="mr-1">{getTeamIcon(sticker.team)}</span>
            {sticker.team}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[11px] font-black text-pitch dark:bg-neutral-900">
          {target === "give" ? t("trades.pickerAddGive") : t("trades.pickerAddReceive")}
        </span>
        {quantity > 0 ? (
          <span className="hidden shrink-0 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 sm:inline">
            {duplicateCount > 0 ? `×${duplicateCount}` : "×1"}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function getFilterHintKey(filter: ManualTradePickerFilter): TranslationKey {
  if (filter === "duplicates") return "trades.pickerDuplicatesHint";
  if (filter === "missing") return "trades.pickerMissingHint";
  return "trades.pickerAllHint";
}
