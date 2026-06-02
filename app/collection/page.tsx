"use client";

import { useState } from "react";
import { GuideCard } from "@/components/GuideCard";
import { BulkActions } from "@/features/stickers/BulkActions";
import { FilterBar } from "@/features/stickers/FilterBar";
import { StickerGrid } from "@/features/stickers/StickerGrid";
import { StickerList } from "@/features/stickers/StickerList";
import { ViewModeSwitch } from "@/features/stickers/ViewModeSwitch";
import { useI18n } from "@/hooks/useI18n";
import { stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { StickerFilter } from "@/types/sticker";

export default function CollectionPage() {
  const viewMode = useCollectionStore((state) => state.viewMode);
  const setViewMode = useCollectionStore((state) => state.setViewMode);
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StickerFilter>("all");

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-white p-3 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("collection.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("collection.body")}</p>
      </section>

      <GuideCard guide="collection" titleKey="guide.collectionTitle" bodyKey="guide.collectionBody" />

      <section className="space-y-2 pb-4">
        <FilterBar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
        <ViewModeSwitch value={viewMode} onChange={setViewMode} />
        <BulkActions />
        {viewMode === "list" ? (
          <StickerList list={stickers} query={query} filter={filter} heightClassName="h-[calc(100vh-230px)] min-h-[520px]" />
        ) : (
          <StickerGrid list={stickers} query={query} filter={filter} heightClassName="h-[calc(100vh-230px)] min-h-[560px]" />
        )}
      </section>
    </div>
  );
}
