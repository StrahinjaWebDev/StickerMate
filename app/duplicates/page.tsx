"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/features/stickers/FilterBar";
import { StickerList } from "@/features/stickers/StickerList";
import { stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function DuplicatesPage() {
  const [query, setQuery] = useState("");
  const quantities = useCollectionStore((state) => state.quantities);

  const duplicates = useMemo(
    () =>
      stickers
        .filter((sticker) => (quantities[sticker.code] ?? 0) > 1)
        .sort((a, b) => {
          const quantityDiff = (quantities[b.code] ?? 0) - (quantities[a.code] ?? 0);
          return quantityDiff || a.team.localeCompare(b.team) || a.code.localeCompare(b.code);
        }),
    [quantities]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-3xl font-black text-ink dark:text-white">Duplicates</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {duplicates.length} stickers ready for trading.
        </p>
      </section>

      {duplicates.length === 0 ? (
        <EmptyState icon={Copy} title="No duplicates yet" body="Add a second copy of any sticker and it will show here." />
      ) : (
        <section className="space-y-3">
          <FilterBar query={query} filter="duplicates" onQueryChange={setQuery} onFilterChange={() => undefined} />
          <StickerList list={duplicates} query={query} filter="duplicates" />
        </section>
      )}
    </div>
  );
}
