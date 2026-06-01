"use client";

import { getSticker } from "@/lib/stickers";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import type { ImportSummary, Sticker } from "@/types/sticker";

export function ImportPreview({ summary }: { summary: ImportSummary }) {
  const { t } = useI18n();

  return (
    <div className="mt-4 space-y-4">
      <PreviewGroup title={t("import.newStickers")} codes={summary.newCodes} />
      <PreviewGroup title={t("import.duplicates")} codes={summary.duplicateCodes} />
      {summary.invalidCodes.length > 0 ? (
        <div>
          <h3 className="text-sm font-black text-ink dark:text-white">{t("import.invalidCodes")}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.invalidCodes.slice(0, 20).map((code, index) => (
              <span
                key={`${code}-${index}`}
                className="rounded-md bg-coral/10 px-2 py-1 text-xs font-black text-coral"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewGroup({ title, codes }: { title: string; codes: string[] }) {
  const stickers = codes
    .map(getSticker)
    .filter((sticker): sticker is Sticker => Boolean(sticker))
    .slice(0, 12);

  if (stickers.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-black text-ink dark:text-white">{title}</h3>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {stickers.map((sticker) => (
          <div key={sticker.code} className="w-20 shrink-0">
            <StickerImage sticker={sticker} quantity={1} className="aspect-[3/4] w-full" sizes="80px" />
            <p className="mt-1 truncate text-center text-xs font-black text-ink dark:text-white">{sticker.code}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
