"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import { getSticker } from "@/lib/stickers";
import type { ImportSummary, Sticker } from "@/types/sticker";

const PREVIEW_LIMIT = 10;

export function ImportPreview({ summary }: { summary: ImportSummary }) {
  const { t } = useI18n();
  const newCount = summary.newCodes.length;
  const duplicateStickerCount = summary.duplicateCodes.length;
  const hasSaved = summary.imported > 0;

  return (
    <Card className="scroll-mt-24 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {hasSaved ? (
        <div className="space-y-1 border-b border-line pb-4 dark:border-white/10">
          <p className="text-lg font-black text-ink dark:text-white">
            {t("import.savedTotal", { count: summary.imported })}
          </p>
          {newCount > 0 ? (
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {t("import.newCount", { count: newCount })}
            </p>
          ) : null}
          {summary.duplicates > 0 ? (
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {t("import.duplicateCount", { count: summary.duplicates })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={hasSaved ? "mt-4 space-y-5" : "space-y-5"}>
        {newCount > 0 ? (
          <StickerPreviewSection
            title={t("import.newStickers")}
            codes={summary.newCodes}
            shownLabel={(shown, total) => t("import.shownOfNew", { shown, total })}
            viewAllLabel={t("import.viewAllNew")}
            showLessLabel={t("import.showLess")}
          />
        ) : null}

        {duplicateStickerCount > 0 ? (
          <StickerPreviewSection
            title={t("import.duplicates")}
            codes={summary.duplicateCodes}
            shownLabel={(shown, total) => t("import.shownOfDuplicates", { shown, total })}
            viewAllLabel={t("import.viewAllDuplicates")}
            showLessLabel={t("import.showLess")}
          />
        ) : null}

        {summary.invalidCodes.length > 0 ? (
          <InvalidCodesSection codes={summary.invalidCodes} invalidCount={summary.invalid} />
        ) : null}
      </div>
    </Card>
  );
}

function StickerPreviewSection({
  title,
  codes,
  shownLabel,
  viewAllLabel,
  showLessLabel
}: {
  title: string;
  codes: string[];
  shownLabel: (shown: number, total: number) => string;
  viewAllLabel: string;
  showLessLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const stickers = codes
    .map(getSticker)
    .filter((sticker): sticker is Sticker => Boolean(sticker));
  const total = stickers.length;

  if (total === 0) return null;

  const previewStickers = expanded ? stickers : stickers.slice(0, PREVIEW_LIMIT);
  const hasMore = total > PREVIEW_LIMIT;
  const shown = expanded ? total : Math.min(PREVIEW_LIMIT, total);

  return (
    <section>
      <h3 className="text-sm font-black text-ink dark:text-white">{title}</h3>
      <p className="mt-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        {shownLabel(shown, total)}
      </p>

      {expanded ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {previewStickers.map((sticker) => (
            <StickerPreviewTile key={sticker.code} sticker={sticker} />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {previewStickers.map((sticker) => (
            <StickerPreviewTile key={sticker.code} sticker={sticker} className="w-[4.5rem] shrink-0 sm:w-20" />
          ))}
        </div>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-black text-pitch transition hover:text-pitch/80 active:scale-[0.98]"
        >
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? showLessLabel : viewAllLabel}
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
  const previewCodes = expanded ? codes : codes.slice(0, PREVIEW_LIMIT);
  const hasMore = total > PREVIEW_LIMIT;
  const shown = expanded ? total : Math.min(PREVIEW_LIMIT, total);

  return (
    <section>
      <h3 className="text-sm font-black text-ink dark:text-white">{t("import.invalidCodes")}</h3>
      <p className="mt-1 text-xs font-semibold text-coral">{t("import.invalidCount", { count: invalidCount || total })}</p>
      {total > 0 ? (
        <p className="mt-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          {t("import.shownOfInvalid", { shown, total })}
        </p>
      ) : null}
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
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-black text-pitch transition hover:text-pitch/80 active:scale-[0.98]"
        >
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? t("import.showLess") : t("import.viewAllInvalid")}
        </button>
      ) : null}
    </section>
  );
}
