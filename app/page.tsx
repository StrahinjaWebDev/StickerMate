"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CircleOff, Layers3, Wallet } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { GuideCard } from "@/components/GuideCard";
import { BulkActions } from "@/features/stickers/BulkActions";
import { FilterBar } from "@/features/stickers/FilterBar";
import { Onboarding } from "@/features/stickers/Onboarding";
import { RecentStickers } from "@/features/stickers/RecentStickers";
import { StatsCards } from "@/features/stickers/StatsCards";
import { StickerGrid } from "@/features/stickers/StickerGrid";
import { StickerList } from "@/features/stickers/StickerList";
import { TeamStrip } from "@/features/stickers/TeamStrip";
import { ViewModeSwitch } from "@/features/stickers/ViewModeSwitch";
import { useI18n } from "@/hooks/useI18n";
import { formatMoney, getSpendingStats } from "@/lib/spending";
import { getStats, stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { StickerFilter } from "@/types/sticker";

export default function HomePage() {
  const onboarded = useCollectionStore((state) => state.onboarded);
  const quantities = useCollectionStore((state) => state.quantities);
  const spendingEntries = useCollectionStore((state) => state.spendingEntries);
  const defaultCurrency = useCollectionStore((state) => state.defaultCurrency);
  const viewMode = useCollectionStore((state) => state.viewMode);
  const reviewCurrentIndex = useCollectionStore((state) => state.reviewCurrentIndex);
  const reviewCompleted = useCollectionStore((state) => state.reviewCompleted);
  const setViewMode = useCollectionStore((state) => state.setViewMode);
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StickerFilter>("all");

  const stats = useMemo(() => getStats(quantities, stickers), [quantities]);
  const spendingStats = useMemo(
    () => getSpendingStats(spendingEntries, defaultCurrency, stats.owned),
    [defaultCurrency, spendingEntries, stats.owned]
  );

  if (!onboarded) return <Onboarding />;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("dashboard.title")}</h1>
            <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {t("dashboard.collectedLine", { owned: stats.owned, total: stats.total, missing: stats.missing })}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-field px-3 py-2 text-sm font-black text-coral dark:bg-neutral-950">
            <CircleOff size={18} />
            {t("dashboard.missingCount", { count: stats.missing })}
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={stats.completion} />
        </div>
      </section>

      <GuideCard guide="dashboard" titleKey="guide.dashboardTitle" bodyKey="guide.dashboardBody" />
      <StatsCards stats={stats} />
      <Link
        href="/spending"
        className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 text-ink shadow-sm transition hover:bg-field dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Wallet size={21} />
          </span>
          <span className="min-w-0">
            <span className="block font-black">{t("spending.spent")}</span>
            <span className="mt-0.5 block text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              {t("spending.costPerSticker")}:{" "}
              {spendingStats.costPerOwnedSticker
                ? formatMoney(spendingStats.costPerOwnedSticker, defaultCurrency, language)
                : "-"}
            </span>
          </span>
        </span>
        <span className="text-2xl font-black text-ink dark:text-white">
          {formatMoney(spendingStats.totalSpent, defaultCurrency, language)}
        </span>
      </Link>
      {!reviewCompleted && reviewCurrentIndex > 0 ? (
        <Link
          href="/review"
          className="flex flex-col gap-3 rounded-lg border border-pitch/20 bg-pitch/10 p-4 text-ink shadow-sm transition hover:bg-pitch/15 dark:border-pitch/30 dark:bg-pitch/15 dark:text-white sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
              <Layers3 size={21} />
            </span>
            <span className="min-w-0">
              <span className="block font-black">{t("review.continueReview")}</span>
              <span className="mt-0.5 block text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                {t("review.progress", { current: reviewCurrentIndex + 1, total: stickers.length })}
              </span>
            </span>
          </span>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-pitch shadow-sm dark:bg-neutral-900">
            <ArrowRight size={19} />
          </span>
        </Link>
      ) : null}
      <RecentStickers />
      <TeamStrip />

      <section className="space-y-3">
        <GuideCard guide="collection" titleKey="guide.collectionTitle" bodyKey="guide.collectionBody" />
        <FilterBar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
        <ViewModeSwitch value={viewMode} onChange={setViewMode} />
        <BulkActions />
        {viewMode === "list" ? (
          <StickerList list={stickers} query={query} filter={filter} />
        ) : (
          <StickerGrid list={stickers} query={query} filter={filter} />
        )}
      </section>
    </div>
  );
}
