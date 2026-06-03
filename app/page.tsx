"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CircleOff, Layers3, Wallet } from "lucide-react";
import { AccountStatusPrompt } from "@/components/AccountStatusPrompt";
import { ProgressBar } from "@/components/ProgressBar";
import { ShareAppButton } from "@/components/ShareAppButton";
import { RecentStickers } from "@/features/stickers/RecentStickers";
import { StatsCards } from "@/features/stickers/StatsCards";
import { useI18n } from "@/hooks/useI18n";
import { formatMoney, getEstimatedSpendingFromCollection } from "@/lib/spending";
import { getStats, stickers, stickersByTeam } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function HomePage() {
  const quantities = useCollectionStore((state) => state.quantities);
  const reviewCurrentIndex = useCollectionStore((state) => state.reviewCurrentIndex);
  const reviewCompleted = useCollectionStore((state) => state.reviewCompleted);
  const { language, t } = useI18n();

  const stats = useMemo(() => getStats(quantities, stickers), [quantities]);
  const spendingEstimate = useMemo(() => getEstimatedSpendingFromCollection(quantities), [quantities]);
  const teamPreview = useMemo(
    () =>
      stickersByTeam
        .map((group) => ({ team: group.team, stats: getStats(quantities, group.stickers) }))
        .filter((item) => item.stats.owned > 0)
        .slice(0, 4),
    [quantities]
  );
  const teamPreviewFallback = useMemo(
    () => stickersByTeam.slice(0, 4).map((group) => ({ team: group.team, stats: getStats(quantities, group.stickers) })),
    [quantities]
  );

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ShareAppButton className="min-h-10 px-3 text-sm" />
            <div className="flex items-center gap-2 rounded-lg bg-field px-3 py-2 text-sm font-black text-coral dark:bg-neutral-950">
              <CircleOff size={18} />
              {t("dashboard.missingCount", { count: stats.missing })}
            </div>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={stats.completion} />
        </div>
      </section>

      <AccountStatusPrompt />

      <StatsCards stats={stats} />

      <Link
        href="/spending"
        className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Wallet size={21} />
          </span>
          <span className="min-w-0">
            <span className="block font-black">{t("spending.title")}</span>
            <span className="mt-0.5 block text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              {t("spending.homeSubtitle")}
            </span>
          </span>
        </span>
        <span className="text-2xl font-black text-ink dark:text-white">
          {formatMoney(spendingEstimate.totalSpentRsd, language)}
        </span>
      </Link>

      {!reviewCompleted && reviewCurrentIndex > 0 ? (
        <Link
          href="/review"
          className="flex flex-col gap-3 rounded-lg border border-pitch/20 bg-pitch/10 p-4 text-ink shadow-sm transition hover:bg-pitch/15 active:scale-[0.98] dark:border-pitch/30 dark:bg-pitch/15 dark:text-white sm:flex-row sm:items-center sm:justify-between"
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

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-ink dark:text-white">{t("teams.title")}</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("teams.bodyShort")}</p>
          </div>
          <Link
            href="/teams"
            className="shrink-0 rounded-lg bg-pitch px-3 py-2 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {t("common.open")}
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(teamPreview.length > 0 ? teamPreview : teamPreviewFallback).map(({ team, stats: teamStats }) => (
            <Link
              key={team}
              href={`/collection?section=${encodeURIComponent(team)}`}
              className="rounded-lg bg-field p-3 transition active:scale-[0.98] dark:bg-neutral-950"
            >
              <p className="truncate text-sm font-black text-ink dark:text-white">
                <span className="mr-2">{getTeamIcon(team)}</span>
                {team}
              </p>
              <p className="mt-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                {t("teams.collected", { owned: teamStats.owned, total: teamStats.total })}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
