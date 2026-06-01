"use client";

import { CircleOff, Copy, Goal, Trophy } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { formatPercent } from "@/lib/stickers";
import type { CollectionStats } from "@/types/sticker";

const cards = [
  { key: "owned", labelKey: "stats.owned", icon: Trophy, tone: "text-pitch" },
  { key: "missing", labelKey: "stats.missing", icon: CircleOff, tone: "text-coral" },
  { key: "duplicates", labelKey: "stats.duplicates", icon: Copy, tone: "text-gold" },
  { key: "completion", labelKey: "stats.completion", icon: Goal, tone: "text-ink dark:text-white" }
] as const;

export function StatsCards({ stats }: { stats: CollectionStats }) {
  const { t } = useI18n();

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" aria-label={t("stats.collection")}>
      {cards.map((card) => {
        const Icon = card.icon;
        const value = card.key === "completion" ? formatPercent(stats.completion) : stats[card.key];

        return (
          <article
            key={card.key}
            className="rounded-lg border border-line bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">{t(card.labelKey)}</span>
              <Icon className={card.tone} size={19} />
            </div>
            <p className="mt-3 text-2xl font-black text-ink dark:text-white sm:text-3xl">{value}</p>
          </article>
        );
      })}
    </section>
  );
}
