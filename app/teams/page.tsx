"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import { getStats, normalize, stickersByTeam } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function TeamsPage() {
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const [query, setQuery] = useState("");
  const teams = useMemo(
    () =>
      stickersByTeam
        .map((group) => ({
          team: group.team,
          stats: getStats(quantities, group.stickers)
        }))
        .filter((group) => normalize(group.team).includes(normalize(query))),
    [quantities, query]
  );

  return (
    <div className="space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("teams.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("teams.body")}
        </p>
      </Card>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-12 w-full rounded-lg border-line bg-white pl-11 pr-4 text-base font-semibold shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          placeholder={t("teams.search")}
          aria-label={t("teams.search")}
        />
      </label>

      {teams.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("teams.emptyTitle")}
          body={t("teams.emptyBody")}
          actionLabel={t("teams.emptyAction")}
          onAction={() => setQuery("")}
        />
      ) : (
        <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(({ team, stats }) => (
            <Link
              key={team}
              href={`/team/${encodeURIComponent(team)}`}
              className="min-w-0 rounded-lg border border-line bg-white p-4 shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 truncate text-lg font-black text-ink dark:text-white">
                  <span className="mr-2">{getTeamIcon(team)}</span>
                  {team}
                </h2>
                <span className="shrink-0 text-sm font-black text-pitch">
                  {stats.owned}/{stats.total}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar value={stats.completion} />
              </div>
              <p className="mt-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                {t("team.summary", { owned: stats.owned, missing: stats.missing, duplicates: stats.duplicates })}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
