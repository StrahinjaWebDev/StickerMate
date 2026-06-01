"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { BulkActions } from "@/features/stickers/BulkActions";
import { FilterBar } from "@/features/stickers/FilterBar";
import { StatsCards } from "@/features/stickers/StatsCards";
import { StickerList } from "@/features/stickers/StickerList";
import { getStats, stickersByTeam } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { StickerFilter } from "@/types/sticker";

export default function TeamPage() {
  const params = useParams<{ team: string }>();
  const teamName = decodeURIComponent(params.team);
  const group = stickersByTeam.find((item) => item.team === teamName);
  const quantities = useCollectionStore((state) => state.quantities);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StickerFilter>("all");

  const stats = useMemo(() => (group ? getStats(quantities, group.stickers) : null), [group, quantities]);

  if (!group || !stats) notFound();

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <ArrowLeft size={18} />
        Dashboard
      </Link>

      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-3xl font-black text-ink dark:text-white">{group.team}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {stats.owned} owned, {stats.missing} missing, {stats.duplicates} duplicates
        </p>
        <div className="mt-5">
          <ProgressBar value={stats.completion} />
        </div>
      </section>

      <StatsCards stats={stats} />

      <section className="space-y-3">
        <FilterBar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
        <BulkActions />
        <StickerList list={group.stickers} query={query} filter={filter} />
      </section>
    </div>
  );
}
