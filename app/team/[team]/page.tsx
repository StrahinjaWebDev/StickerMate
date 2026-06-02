"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { GuideCard } from "@/components/GuideCard";
import { BulkActions } from "@/features/stickers/BulkActions";
import { FilterBar } from "@/features/stickers/FilterBar";
import { StatsCards } from "@/features/stickers/StatsCards";
import { StickerGrid } from "@/features/stickers/StickerGrid";
import { useI18n } from "@/hooks/useI18n";
import { getStats, stickersByTeam } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { StickerFilter } from "@/types/sticker";

export default function TeamPage() {
  const params = useParams<{ team: string }>();
  const teamName = decodeURIComponent(params.team);
  const group = stickersByTeam.find((item) => item.team === teamName);
  const quantities = useCollectionStore((state) => state.quantities);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StickerFilter>("all");
  const { t } = useI18n();

  const stats = useMemo(() => (group ? getStats(quantities, group.stickers) : null), [group, quantities]);

  if (!group || !stats) notFound();

  return (
    <div className="space-y-5">
      <Link href="/teams" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <ArrowLeft size={18} />
        {t("team.back")}
      </Link>

      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-3xl font-black text-ink dark:text-white">
          <span className="mr-2">{getTeamIcon(group.team)}</span>
          {group.team}
        </h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {t("team.summary", { owned: stats.owned, missing: stats.missing, duplicates: stats.duplicates })}
        </p>
        <div className="mt-5">
          <ProgressBar value={stats.completion} />
        </div>
      </section>

      <StatsCards stats={stats} />

      <GuideCard guide="teams" titleKey="guide.teamsTitle" bodyKey="guide.teamsBody" />

      <section className="space-y-3">
        <FilterBar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
        <BulkActions />
        <StickerGrid list={group.stickers} query={query} filter={filter} />
      </section>
    </div>
  );
}
