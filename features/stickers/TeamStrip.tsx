"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { getStats, stickersByTeam } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function TeamStrip() {
  const quantities = useCollectionStore((state) => state.quantities);
  const { t } = useI18n();
  const teams = useMemo(
    () =>
      stickersByTeam.map((group) => ({
        team: group.team,
        stats: getStats(quantities, group.stickers)
      })),
    [quantities]
  );

  return (
    <section aria-label={t("teams.label")} className="-mx-3 overflow-x-auto px-3 pb-1 no-scrollbar sm:-mx-5 sm:px-5">
      <div className="flex gap-2">
        {teams.map(({ team, stats }) => (
          <Link
            key={team}
            href={`/team/${encodeURIComponent(team)}`}
            className="min-w-44 shrink-0 rounded-lg border border-line bg-white p-3 shadow-sm transition hover:border-pitch dark:border-white/10 dark:bg-neutral-900"
          >
            <p className="truncate text-sm font-black text-ink dark:text-white">{team}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-pitch" style={{ width: `${stats.completion}%` }} />
            </div>
            <p className="mt-2 text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {t("teams.collected", { owned: stats.owned, total: stats.total })}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
