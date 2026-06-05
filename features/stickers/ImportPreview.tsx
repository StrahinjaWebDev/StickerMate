"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import { getSticker } from "@/lib/stickers";
import type { ImportSummary, Sticker } from "@/types/sticker";

/** Mobile preview row length — full totals always shown in summary counts above. */
export const IMPORT_PREVIEW_LIMIT = 8;

export function ImportPreview({ summary }: { summary: ImportSummary }) {
  const { t } = useI18n();
  const newCount = summary.newCodes.length;
  const duplicateStickerCount = summary.duplicateCodes.length;
  const invalidCount = summary.invalidCodes.length;
  const hasSaved = summary.imported > 0;

  return (
    <Card className="scroll-mt-24 overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <p className="text-base font-black text-pitch">{t("entry.saved")}</p>

      {hasSaved || invalidCount > 0 ? (
        <dl className="mt-3 space-y-1.5 border-b border-line pb-4 dark:border-white/10">
          {hasSaved ? (
            <>
              <SummaryRow label={t("import.processedTotal")} value={String(summary.imported)} />
              <SummaryRow label={t("import.newStickers")} value={String(newCount)} />
              <SummaryRow label={t("import.duplicates")} value={String(summary.duplicates)} />
            </>
          ) : null}
          {invalidCount > 0 ? (
            <SummaryRow label={t("import.invalidCodes")} value={String(invalidCount)} tone="danger" />
          ) : null}
        </dl>
      ) : null}

      {hasSaved ? (
        <p className="mt-3 text-xs font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
          {t("import.allSavedHint")}
        </p>
      ) : null}

      <div className={hasSaved || invalidCount > 0 ? "mt-4 space-y-5" : "mt-3 space-y-5"}>
        {newCount > 0 ? (
          <StickerPreviewSection
            title={t("import.newStickers")}
            codes={summary.newCodes}
            shownLabel={(shown, total) => t("import.shownOfNew", { shown, total })}
          />
        ) : null}

        {duplicateStickerCount > 0 ? (
          <StickerPreviewSection
            title={t("import.duplicates")}
            codes={summary.duplicateCodes}
            shownLabel={(shown, total) => t("import.shownOfDuplicates", { shown, total })}
            extraNote={
              summary.duplicates > duplicateStickerCount
                ? t("import.duplicateOccurrences", { count: summary.duplicates })
                : undefined
            }
          />
        ) : null}

        {invalidCount > 0 ? (
          <InvalidCodesSection codes={summary.invalidCodes} invalidCount={invalidCount} />
        ) : null}
      </div>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="font-semibold text-neutral-600 dark:text-neutral-400">{label}</dt>
      <dd className={`font-black tabular-nums ${tone === "danger" ? "text-coral" : "text-ink dark:text-white"}`}>
        {value}
      </dd>
    </div>
  );
}

function StickerPreviewSection({
  title,
  codes,
  shownLabel,
  extraNote
}: {
  title: string;
  codes: string[];
  shownLabel: (shown: number, total: number) => string;
  extraNote?: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const stickers = codes
    .map(getSticker)
    .filter((sticker): sticker is Sticker => Boolean(sticker));
  const total = stickers.length;

  if (total === 0) return null;

  const previewStickers = expanded ? stickers : stickers.slice(0, IMPORT_PREVIEW_LIMIT);
  const hasMore = total > IMPORT_PREVIEW_LIMIT;
  const shown = expanded ? total : Math.min(IMPORT_PREVIEW_LIMIT, total);

  return (
    <section className="min-w-0">
      <h3 className="text-sm font-black text-ink dark:text-white">{title}</h3>
      <p className="mt-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        {shownLabel(shown, total)}
      </p>
      {extraNote ? (
        <p className="mt-0.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">{extraNote}</p>
      ) : null}

      {expanded ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {previewStickers.map((sticker) => (
            <StickerPreviewTile key={sticker.code} sticker={sticker} />
          ))}
        </div>
      ) : (
        <div className="mt-3 min-w-0 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex w-max max-w-full gap-2">
            {previewStickers.map((sticker) => (
              <StickerPreviewTile key={sticker.code} sticker={sticker} className="w-[4.25rem] shrink-0 sm:w-20" />
            ))}
          </div>
        </div>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-black text-pitch transition hover:text-pitch/80 active:scale-[0.98]"
        >
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? t("import.showLess") : t("import.viewAll")}
        </button>
      ) : null}
    </section>
  );
}

function StickerPreviewTile({ sticker, className = "w-20 shrink-0" }: { sticker: Sticker; className?: string }) {
  return (
    <div className={className}>
      <StickerImage sticker={sticker} quantity={1} className="aspect-[3/4] w-full" sizes="80px" />
      <p className="mt-1 truncate text-center text-xs font-black text-ink dark:text-white">{sticker.code}</p>
    </div>
  );
}

function InvalidCodesSection({ codes, invalidCount }: { codes: string[]; invalidCount: number }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const total = codes.length;
  const previewCodes = expanded ? codes : codes.slice(0, IMPORT_PREVIEW_LIMIT);
  const hasMore = total > IMPORT_PREVIEW_LIMIT;
  const shown = expanded ? total : Math.min(IMPORT_PREVIEW_LIMIT, total);

  return (
    <section className="min-w-0">
      <h3 className="text-sm font-black text-ink dark:text-white">{t("import.invalidCodes")}</h3>
      <p className="mt-1 text-xs font-semibold text-coral">{t("import.invalidNotSaved", { count: invalidCount })}</p>
      <p className="mt-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        {t("import.shownOfInvalid", { shown, total })}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {previewCodes.map((code, index) => (
          <span key={`${code}-${index}`} className="rounded-md bg-coral/10 px-2 py-1 text-xs font-black text-coral">
            {code}
          </span>
        ))}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-black text-pitch transition hover:text-pitch/80 active:scale-[0.98]"
        >
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? t("import.showLess") : t("import.viewAll")}
        </button>
      ) : null}
    </section>
  );
}
