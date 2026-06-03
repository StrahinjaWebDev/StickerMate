"use client";

import { useState } from "react";
import { ArrowRight, ClipboardList, Keyboard, Layers3, RotateCcw } from "lucide-react";
import { QuickAlbumReview } from "@/features/stickers/QuickAlbumReview";
import { useI18n } from "@/hooks/useI18n";
import { stickerCount, stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function Onboarding() {
  const [mode, setMode] = useState<"welcome" | "review" | "reviewChoice">("welcome");
  const reviewCurrentIndex = useCollectionStore((state) => state.reviewCurrentIndex);
  const reviewCompleted = useCollectionStore((state) => state.reviewCompleted);
  const setOnboarded = useCollectionStore((state) => state.setOnboarded);
  const resetReview = useCollectionStore((state) => state.resetReview);
  const { t } = useI18n();

  const hasReviewProgress = reviewCurrentIndex > 0 || reviewCompleted;

  if (mode === "review") {
    return <QuickAlbumReview />;
  }

  if (mode === "reviewChoice") {
    return (
      <section className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Layers3 size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-ink dark:text-white">{t("onboarding.reviewChoiceTitle")}</h1>
            <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t("onboarding.reviewChoiceBody")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="flex min-h-24 items-start gap-3 rounded-lg border border-line bg-white p-4 text-left text-ink shadow-sm dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            onClick={() => setMode("review")}
          >
            <ArrowRight className="mt-0.5 shrink-0 text-pitch" size={22} />
            <span>
              <span className="block font-black">{t("onboarding.reviewContinue")}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                {t("onboarding.reviewContinueBody", { current: reviewCurrentIndex + 1, total: stickers.length })}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="flex min-h-24 items-start gap-3 rounded-lg bg-pitch p-4 text-left text-white shadow-lift"
            onClick={() => {
              resetReview();
              setMode("review");
            }}
          >
            <RotateCcw className="mt-0.5 shrink-0" size={22} />
            <span>
              <span className="block font-black">{t("onboarding.reviewRestart")}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-white/85">
                {t("onboarding.reviewRestartBody")}
              </span>
            </span>
          </button>
        </div>

        <button
          type="button"
          className="mt-4 min-h-12 rounded-lg border border-line px-5 font-black text-ink dark:border-white/10 dark:text-white"
          onClick={() => setMode("welcome")}
        >
          {t("common.back")}
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl py-8 lg:py-14">
      <div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-black text-pitch shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <ClipboardList size={18} />
          {t("onboarding.badge", { count: stickerCount })}
        </div>
        <h1 className="mt-5 text-5xl font-black tracking-normal text-ink dark:text-white sm:text-6xl">
          {t("onboarding.title")}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
          {t("onboarding.body")}
        </p>
        <p className="mt-6 text-sm font-black uppercase text-neutral-500 dark:text-neutral-400">
          {t("onboarding.chooseStart")}
        </p>
        <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-3">
          <button
            type="button"
            className="flex min-h-28 items-start gap-3 rounded-lg bg-pitch p-4 text-left text-white shadow-lift transition active:scale-[0.98]"
            onClick={() => setMode(hasReviewProgress ? "reviewChoice" : "review")}
          >
            <Layers3 className="mt-0.5 shrink-0" size={22} />
            <span>
              <span className="block font-black">{t("onboarding.quickReview")}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-white/85">
                {t("onboarding.quickReviewBody")}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="flex min-h-28 items-start gap-3 rounded-lg border border-line bg-white p-4 text-left text-ink shadow-sm transition active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            onClick={() => setOnboarded(true)}
          >
            <Keyboard className="mt-0.5 shrink-0 text-pitch" size={22} />
            <span>
              <span className="block font-black">{t("onboarding.manualSetup")}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                {t("onboarding.manualSetupBody")}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="flex min-h-28 items-start gap-3 rounded-lg border border-line px-4 py-4 text-left text-neutral-700 transition active:scale-[0.98] dark:border-white/10 dark:text-neutral-300"
            onClick={() => setOnboarded(true)}
          >
            <ArrowRight className="mt-0.5 shrink-0 text-neutral-500 dark:text-neutral-400" size={22} />
            <span>
              <span className="block font-black">{t("onboarding.skip")}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                {t("onboarding.skipBody")}
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
