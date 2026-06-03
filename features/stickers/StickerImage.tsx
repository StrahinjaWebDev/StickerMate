"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import localImageManifest from "@/public/stickers/manifest.json";
import { getLocalStickerImagePath } from "@/lib/stickers";
import { useI18n } from "@/hooks/useI18n";
import type { Sticker } from "@/types/sticker";

type ImagePhase = "local" | "remote" | "placeholder";
const localImages = new Set(localImageManifest as string[]);
const loadedStickerImages = new Set<string>();

function getInitialPhase(sticker: Sticker): ImagePhase {
  const hasLocalImage = localImages.has(sticker.imageCode ?? sticker.code.toLowerCase());
  return hasLocalImage ? "local" : "remote";
}

export function isSpecialSticker(sticker: Sticker) {
  return /s$/i.test(sticker.code);
}

export function StickerImage({
  sticker,
  quantity = 0,
  className,
  imageClassName,
  showTextPlaceholder = true,
  sizes,
  priority = false
}: {
  sticker: Sticker;
  quantity?: number;
  className?: string;
  imageClassName?: string;
  showTextPlaceholder?: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<ImagePhase>(() => getInitialPhase(sticker));
  const [imageLoaded, setImageLoaded] = useState(() => loadedStickerImages.has(sticker.code));
  const src = useMemo(() => {
    if (phase === "local") return getLocalStickerImagePath(sticker);
    if (phase === "remote") return sticker.imageUrl;
    return undefined;
  }, [phase, sticker]);

  useEffect(() => {
    setPhase(getInitialPhase(sticker));
    setImageLoaded(loadedStickerImages.has(sticker.code));
  }, [sticker]);

  useEffect(() => {
    if (phase !== "remote" || imageLoaded) return undefined;

    const timeout = window.setTimeout(() => {
      setPhase((current) => (current === "remote" ? "placeholder" : current));
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [imageLoaded, phase, sticker.code]);

  const missing = quantity === 0;
  const showPlaceholder = !src || !imageLoaded;

  function markLoaded() {
    loadedStickerImages.add(sticker.code);
    setImageLoaded(true);
  }

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-md border bg-neutral-100 dark:bg-neutral-950",
        isSpecialSticker(sticker) ? "border-gold/80" : "border-line dark:border-white/10",
        missing && "opacity-70",
        className
      )}
    >
      {showPlaceholder ? (
        <StickerPlaceholder sticker={sticker} showText={showTextPlaceholder} className="absolute inset-0" />
      ) : null}
      {src ? (
        <img
          key={`${sticker.code}-${phase}`}
          src={src}
          alt={`${sticker.code} ${sticker.name}`}
          width={120}
          height={160}
          loading="eager"
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          sizes={sizes}
          className={clsx(
            "relative z-[1] h-full w-full object-cover transition-opacity duration-150",
            missing && "grayscale",
            !imageLoaded && "opacity-0",
            imageClassName
          )}
          onLoad={markLoaded}
          onError={() => {
            setImageLoaded(false);
            loadedStickerImages.delete(sticker.code);
            setPhase((current) => (current === "local" && sticker.imageUrl ? "remote" : "placeholder"));
          }}
        />
      ) : null}
      {missing ? (
        <div className="pointer-events-none absolute inset-0 z-[2] bg-white/28 backdrop-grayscale dark:bg-black/24" aria-hidden="true" />
      ) : null}
      {isSpecialSticker(sticker) ? (
        <span className="absolute right-1 top-1 z-[3] rounded bg-gold px-1.5 py-0.5 text-[10px] font-black text-ink">
          {t("status.special")}
        </span>
      ) : null}
    </div>
  );
}

function StickerPlaceholder({
  sticker,
  showText,
  className
}: {
  sticker: Sticker;
  showText: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("grid h-full w-full place-items-center bg-field p-2 text-center dark:bg-neutral-950", className)}>
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
