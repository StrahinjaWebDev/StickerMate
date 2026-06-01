"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import localImageManifest from "@/public/stickers/manifest.json";
import { getLocalStickerImagePath } from "@/lib/stickers";
import { useI18n } from "@/hooks/useI18n";
import type { Sticker } from "@/types/sticker";

type ImagePhase = "local" | "remote" | "placeholder";
const localImages = new Set(localImageManifest as string[]);

export function isSpecialSticker(sticker: Sticker) {
  return /s$/i.test(sticker.code);
}

export function StickerImage({
  sticker,
  quantity = 0,
  className,
  imageClassName,
  showTextPlaceholder = true,
  sizes
}: {
  sticker: Sticker;
  quantity?: number;
  className?: string;
  imageClassName?: string;
  showTextPlaceholder?: boolean;
  sizes?: string;
}) {
  const { t } = useI18n();
  const hasLocalImage = localImages.has(sticker.imageCode ?? sticker.code.toLowerCase());
  const [phase, setPhase] = useState<ImagePhase>(() => (hasLocalImage ? "local" : "remote"));
  const src = useMemo(() => {
    if (phase === "local") return getLocalStickerImagePath(sticker);
    if (phase === "remote") return sticker.imageUrl;
    return undefined;
  }, [phase, sticker]);

  const missing = quantity === 0;

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-md border bg-neutral-100 dark:bg-neutral-950",
        isSpecialSticker(sticker) ? "border-gold/80" : "border-line dark:border-white/10",
        missing && "opacity-70",
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={`${sticker.code} ${sticker.name}`}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          className={clsx("h-full w-full object-cover", missing && "grayscale", imageClassName)}
          onError={() => setPhase((current) => (current === "local" && sticker.imageUrl ? "remote" : "placeholder"))}
        />
      ) : (
        <StickerPlaceholder sticker={sticker} showText={showTextPlaceholder} />
      )}
      {missing ? (
        <div className="absolute inset-0 bg-white/28 backdrop-grayscale dark:bg-black/24" aria-hidden="true" />
      ) : null}
      {isSpecialSticker(sticker) ? (
        <span className="absolute right-1 top-1 rounded bg-gold px-1.5 py-0.5 text-[10px] font-black text-ink">
          {t("status.special")}
        </span>
      ) : null}
    </div>
  );
}

function StickerPlaceholder({ sticker, showText }: { sticker: Sticker; showText: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center bg-field p-2 text-center dark:bg-neutral-950">
      {showText ? (
        <div className="min-w-0">
          <p className="text-sm font-black text-ink dark:text-white">{sticker.code}</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-neutral-700 dark:text-neutral-300">
            {sticker.name}
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold text-neutral-500 dark:text-neutral-500">
            {sticker.team}
          </p>
        </div>
      ) : (
        <span className="text-xs font-black text-neutral-500 dark:text-neutral-400">{sticker.code}</span>
      )}
    </div>
  );
}
