"use client";

import { useState } from "react";
import { ArrowRight, ClipboardList, Keyboard, Layers3, RotateCcw, Zap } from "lucide-react";
import { ImportPreview } from "@/features/stickers/ImportPreview";
import { QuickAlbumReview } from "@/features/stickers/QuickAlbumReview";
import { useI18n } from "@/hooks/useI18n";
import { formatPercent, getStats, stickerCount, stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { ImportSummary } from "@/types/sticker";

export function Onboarding() {
  const [mode, setMode] = useState<"welcome" | "import" | "review" | "reviewChoice">("welcome");
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const quickImport = useCollectionStore((state) => state.quickImport);
  const quantities = useCollectionStore((state) => state.quantities);
  const reviewCurrentIndex = useCollectionStore((state) => state.reviewCurrentIndex);
  const reviewCompleted = useCollectionStore((state) => state.reviewCompleted);
  const setOnboarded = useCollectionStore((state) => state.setOnboarded);
  const resetReview = useCollectionStore((state) => state.resetReview);
  const { t } = useI18n();

  const stats = getStats(quantities, stickers);
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

  if (mode === "import") {
    return (
      <section className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Zap size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-ink dark:text-white">{t("onboarding.importTitle")}</h1>
            <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t("onboarding.importBody")}
            </p>
          </div>
        </div>

        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="mt-5 min-h-56 w-full rounded-lg border-line bg-field text-base font-semibold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          placeholder={"BRA1\nBRA2\nARG10\nPOR15"}
          aria-label={t("onboarding.codesLabel")}
        />

        {summary ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <SummaryItem label={t("summary.imported")} value={summary.imported} />
              <SummaryItem label={t("summary.duplicates")} value={summary.duplicates} />
              <SummaryItem label={t("summary.invalid")} value={summary.invalid} />
              <SummaryItem label={t("summary.progress")} value={formatPercent(stats.completion)} />
            </div>
            <ImportPreview summary={summary} />
          </>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-pitch px-5 font-black text-white shadow-sm disabled:opacity-50"
            disabled={!input.trim()}
            onClick={() => setSummary(quickImport(input))}
          >
            {t("onboarding.importCodes")}
            <ArrowRight size={19} />
          </button>
          <button
            type="button"
            className="min-h-12 rounded-lg border border-line px-5 font-black text-ink dark:border-white/10 dark:text-white"
            onClick={() => setOnboarded(true)}
          >
            {t("onboarding.continue")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-5xl items-center gap-6 py-8 lg:grid-cols-[1fr_0.8fr] lg:py-14">
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
        <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="flex min-h-24 items-start gap-3 rounded-lg bg-pitch p-4 text-left text-white shadow-lift"
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
            className="flex min-h-24 items-start gap-3 rounded-lg border border-line bg-white p-4 text-left text-ink shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            onClick={() => setMode("import")}
          >
            <Zap className="mt-0.5 shrink-0 text-pitch" size={22} />
            <span>
              <span className="block font-black">{t("onboarding.bulkImport")}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                {t("onboarding.bulkImportBody")}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="flex min-h-24 items-start gap-3 rounded-lg border border-line bg-white p-4 text-left text-ink shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-white"
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
            className="flex min-h-24 items-start gap-3 rounded-lg border border-line px-4 py-4 text-left text-neutral-700 dark:border-white/10 dark:text-neutral-300"
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

      <div className="rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900">
        <div className="rounded-lg bg-field p-4 dark:bg-neutral-950">
          <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">{t("onboarding.preview")}</p>
          <div className="mt-4 space-y-2 font-mono text-sm font-bold">
            {["BRA1", "BRA2", "BRA3", "ARG1", "POR15"].map((code) => (
              <div key={code} className="flex items-center justify-between rounded-md bg-white px-3 py-3 dark:bg-neutral-900">
                <span>{code}</span>
                <span className="rounded-md bg-pitch px-2 py-1 text-xs text-white">{t("status.ownedCard")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
      <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-black text-ink dark:text-white">{value}</p>
    </div>
  );
}
