"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { clsx } from "clsx";
import localImageManifest from "@/public/stickers/manifest.json";
import { getLocalStickerImagePath } from "@/lib/stickers";
import { useI18n } from "@/hooks/useI18n";
import type { Sticker } from "@/types/sticker";

export type StickerImageVariant = "thumbnail" | "card" | "detail";

type ImagePhase = "local" | "remote" | "unavailable";

const localImages = new Set(localImageManifest as string[]);
/** Stickers whose remote/local image failed this session — skip repeat requests. */
const unavailableStickerCodes = new Set<string>();

function stickerImageKey(sticker: Sticker) {
  return sticker.imageCode ?? sticker.code.toLowerCase();
}

function hasBundledLocalImage(sticker: Sticker) {
  return localImages.has(stickerImageKey(sticker));
}

function resolveInitialPhase(sticker: Sticker): ImagePhase {
  if (unavailableStickerCodes.has(sticker.code)) return "unavailable";
  if (hasBundledLocalImage(sticker)) return "local";
  if (sticker.imageUrl) return "remote";
  return "unavailable";
}

function resolveSrc(sticker: Sticker, phase: ImagePhase) {
  if (phase === "unavailable") return null;
  if (phase === "local") return getLocalStickerImagePath(sticker);
  return sticker.imageUrl ?? null;
}

export function isSpecialSticker(sticker: Sticker) {
  return /s$/i.test(sticker.code);
}

function resolveVariant(showTextPlaceholder: boolean, variant?: StickerImageVariant): StickerImageVariant {
  if (variant) return variant;
  return showTextPlaceholder ? "card" : "thumbnail";
}

export function StickerImage({
  sticker,
  quantity = 0,
  className,
  imageClassName,
  showTextPlaceholder = true,
  variant,
  sizes,
  priority = false
}: {
  sticker: Sticker;
  quantity?: number;
  className?: string;
  imageClassName?: string;
  showTextPlaceholder?: boolean;
  variant?: StickerImageVariant;
  sizes?: string;
  priority?: boolean;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<ImagePhase>(() => resolveInitialPhase(sticker));
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const placeholderVariant = resolveVariant(showTextPlaceholder, variant);

  const src = useMemo(() => resolveSrc(sticker, phase), [phase, sticker]);
  const imageReady = Boolean(src && loadedSrc === src);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setPhase(resolveInitialPhase(sticker));
    setLoadedSrc(null);
  }, [sticker]);

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const currentSrc = event.currentTarget.currentSrc || event.currentTarget.src;
      if (!currentSrc) return;
      unavailableStickerCodes.delete(sticker.code);
      setLoadedSrc(currentSrc);
    },
    [sticker.code]
  );

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;

    setLoadedSrc(null);
    setPhase((current) => {
      if (current === "local" && sticker.imageUrl) {
        return "remote";
      }

      unavailableStickerCodes.add(sticker.code);
      return "unavailable";
    });
  }, [sticker.code, sticker.imageUrl]);

  const missing = quantity === 0;

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-md border bg-neutral-100 dark:bg-neutral-950",
        isSpecialSticker(sticker) ? "border-gold/80" : "border-line dark:border-white/10",
        missing && "opacity-90",
        className
      )}
    >
      <StickerPlaceholder
        sticker={sticker}
        variant={placeholderVariant}
        className={clsx("absolute inset-0 z-0", imageReady && "invisible")}
        unavailable={phase === "unavailable"}
      />

      {src ? (
        <img
          key={`${sticker.code}-${phase}`}
          src={src}
          alt={`${sticker.code} ${sticker.name}`}
          width={120}
          height={160}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          sizes={sizes}
          className={clsx(
            "relative z-[1] h-full w-full object-cover transition-opacity duration-150",
            missing && "grayscale",
            imageReady ? "opacity-100" : "opacity-0",
            imageClassName
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}

      {missing ? (
        <div className="pointer-events-none absolute inset-0 z-[2] bg-white/12 dark:bg-black/10" aria-hidden="true" />
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
  variant,
  unavailable = false,
  className
}: {
  sticker: Sticker;
  variant: StickerImageVariant;
  unavailable?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <div
      className={clsx(
        "grid h-full w-full place-items-center bg-field p-1.5 text-center dark:bg-neutral-900",
        className
      )}
      aria-hidden={unavailable ? undefined : true}
      role={unavailable ? "img" : undefined}
      aria-label={unavailable ? t("sticker.imageUnavailable", { code: sticker.code }) : undefined}
    >
      {variant === "thumbnail" ? (
        <div className="flex min-w-0 flex-col items-center gap-1 px-1">
          {unavailable ? <ImageOff size={14} className="shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" /> : null}
          <span className="max-w-full truncate text-[11px] font-black leading-none text-ink sm:text-xs dark:text-white">
            {sticker.code}
          </span>
        </div>
      ) : variant === "card" ? (
        <div className="min-w-0 px-1">
          {unavailable ? (
            <ImageOff size={16} className="mx-auto mb-1 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
          ) : null}
          <p className="text-sm font-black text-ink dark:text-white">{sticker.code}</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-neutral-700 dark:text-neutral-300">
            {sticker.name}
          </p>
        </div>
      ) : (
        <div className="min-w-0 px-2">
          {unavailable ? (
            <ImageOff size={18} className="mx-auto mb-1.5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
          ) : null}
          <p className="text-sm font-black text-ink dark:text-white">{sticker.code}</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-neutral-700 dark:text-neutral-300">
            {sticker.name}
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold text-neutral-500 dark:text-neutral-500">
            {sticker.team}
          </p>
        </div>
      )}
    </div>
  );
}
