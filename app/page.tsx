"use client";

import { useMemo, useState } from "react";
import { CircleOff } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { BulkActions } from "@/features/stickers/BulkActions";
import { FilterBar } from "@/features/stickers/FilterBar";
import { Onboarding } from "@/features/stickers/Onboarding";
import { StatsCards } from "@/features/stickers/StatsCards";
import { StickerList } from "@/features/stickers/StickerList";
import { TeamStrip } from "@/features/stickers/TeamStrip";
import { getStats, stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { StickerFilter } from "@/types/sticker";

export default function HomePage() {
  const onboarded = useCollectionStore((state) => state.onboarded);
  const quantities = useCollectionStore((state) => state.quantities);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StickerFilter>("all");

  const stats = useMemo(() => getStats(quantities, stickers), [quantities]);

  if (!onboarded) return <Onboarding />;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {stats.owned} / {stats.total} collected, {stats.missing} remaining
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-field px-3 py-2 text-sm font-black text-coral dark:bg-neutral-950">
            <CircleOff size={18} />
            {stats.missing} missing
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={stats.completion} />
        </div>
      </section>

      <StatsCards stats={stats} />
      <TeamStrip />

      <section className="space-y-3">
        <FilterBar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
        <BulkActions />
        <StickerList list={stickers} query={query} filter={filter} />
      </section>
    </div>
  );
}
