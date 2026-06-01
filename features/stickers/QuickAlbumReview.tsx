"use client";

import { PointerEvent, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Download, ListRestart, RotateCcw, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { ProgressBar } from "@/components/ProgressBar";
import { StatsCards } from "@/features/stickers/StatsCards";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import { formatPercent, getQuantity, getStats, stickers, stickersByTeam } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function QuickAlbumReview() {
  const router = useRouter();
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const currentIndex = useCollectionStore((state) => state.reviewCurrentIndex);
  const reviewCompleted = useCollectionStore((state) => state.reviewCompleted);
  const setOnboarded = useCollectionStore((state) => state.setOnboarded);
  const setReviewIndex = useCollectionStore((state) => state.setReviewIndex);
  const markReviewSticker = useCollectionStore((state) => state.markReviewSticker);
  const skipReviewSticker = useCollectionStore((state) => state.skipReviewSticker);
  const completeReview = useCollectionStore((state) => state.completeReview);
  const resetReview = useCollectionStore((state) => state.resetReview);
  const exportPayload = useCollectionStore((state) => state.exportPayload);
  const pointerStartX = useRef<number | null>(null);

  const stats = useMemo(() => getStats(quantities, stickers), [quantities]);
  const safeIndex = Math.min(currentIndex, stickers.length - 1);
  const sticker = stickers[safeIndex];
  const quantity = sticker ? getQuantity(quantities, sticker.code) : 0;
  const isComplete = reviewCompleted || currentIndex >= stickers.length;

  useEffect(() => {
    if (currentIndex >= stickers.length && !reviewCompleted) completeReview();
  }, [completeReview, currentIndex, reviewCompleted]);

  function finishLater() {
    setOnboarded(true);
    router.push("/");
  }

  function handleExport() {
    const payload = exportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stickermate-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function mark(quantityValue: number) {
    if (!sticker) return;
    markReviewSticker(sticker.code, quantityValue, currentIndex + 1);
  }

  function goBack() {
    setReviewIndex(currentIndex - 1);
  }

  function skip() {
    skipReviewSticker(currentIndex + 1);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStartX.current = event.clientX;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointerStartX.current === null) return;
    const delta = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(delta) < 70 || isComplete) return;
    if (delta > 0) mark(1);
    else mark(0);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a")) return;
      if (isComplete) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        mark(0);
      }
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        mark(1);
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        goBack();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (isComplete) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-7">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-pitch text-white">
              <Check size={28} />
            </span>
            <h1 className="mt-5 text-3xl font-black text-ink dark:text-white">{t("review.completedTitle")}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-300">
              {t("review.completedBody")}
            </p>
            <p className="mt-3 text-lg font-black text-pitch">{formatPercent(stats.completion)}</p>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Button tone="primary" onClick={finishLater}>
              <ArrowRight size={18} />
              {t("review.goDashboard")}
            </Button>
            <Button onClick={resetReview}>
              <RotateCcw size={18} />
              {t("review.reviewAgain")}
            </Button>
            <Button onClick={handleExport}>
              <Download size={18} />
              {t("review.exportBackup")}
            </Button>
          </div>
        </section>
        <StatsCards stats={stats} />
      </div>
    );
  }

  if (!sticker) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-pitch">{t("review.title")}</p>
            <h1 className="mt-1 text-2xl font-black text-ink dark:text-white sm:text-3xl">
              {t("review.progress", { current: currentIndex + 1, total: stickers.length })}
            </h1>
            <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("review.shortcuts")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto] lg:min-w-[420px]">
            <label className="sr-only" htmlFor="review-team">
              {t("review.jumpTeam")}
            </label>
            <select
              id="review-team"
              value={sticker.team}
              onChange={(event) => {
                const team = stickersByTeam.find((entry) => entry.team === event.target.value);
                const firstSticker = team?.stickers[0];
                if (!firstSticker) return;
                setReviewIndex(stickers.findIndex((item) => item.code === firstSticker.code));
              }}
              className="min-h-12 rounded-lg border border-line bg-field px-3 text-sm font-black text-ink dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            >
              {stickersByTeam.map((entry) => (
                <option key={entry.team} value={entry.team}>
                  {entry.team}
                </option>
              ))}
            </select>
            <Button onClick={finishLater}>
              <ListRestart size={18} />
              {t("review.continueLater")}
            </Button>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={(currentIndex / stickers.length) * 100} />
        </div>
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div
          className="rounded-lg border border-line bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <StickerImage
            sticker={sticker}
            quantity={quantity}
            className="aspect-[3/4] w-full"
            sizes="(max-width: 1024px) 92vw, 380px"
          />
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-pitch">{sticker.code}</p>
                <h2 className="mt-1 text-3xl font-black text-ink dark:text-white">{sticker.name}</h2>
                <p className="mt-1 text-sm font-bold text-neutral-500 dark:text-neutral-400">{sticker.team}</p>
              </div>
              <span className="rounded-lg bg-field px-3 py-2 text-sm font-black text-ink dark:bg-neutral-950 dark:text-white">
                {t("sticker.quantity")}: {quantity}
              </span>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button className="min-h-16 text-base" tone="danger" onClick={() => mark(0)}>
                <X size={21} />
                {t("review.missing")}
              </Button>
              <Button className="min-h-16 text-base" tone="primary" onClick={() => mark(1)}>
                <Check size={21} />
                {t("review.owned")}
              </Button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Button onClick={goBack} disabled={currentIndex === 0}>
                <ArrowLeft size={18} />
                {t("review.back")}
              </Button>
              <Button onClick={() => mark(Math.max(2, quantity))}>
                <RotateCcw size={18} />
                {t("review.duplicate")}
              </Button>
              <Button onClick={skip}>
                <SkipForward size={18} />
                {t("review.skip")}
              </Button>
            </div>
          </section>

          <StatsCards stats={stats} />
        </div>
      </section>
    </div>
  );
}
