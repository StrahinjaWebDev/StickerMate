"use client";

import { Search } from "lucide-react";
import { clsx } from "clsx";
import { useI18n } from "@/hooks/useI18n";
import type { StickerFilter } from "@/types/sticker";

const filters: Array<{ value: StickerFilter; labelKey: "filters.all" | "filters.owned" | "filters.missing" | "filters.duplicates" }> = [
  { value: "all", labelKey: "filters.all" },
  { value: "owned", labelKey: "filters.owned" },
  { value: "missing", labelKey: "filters.missing" },
  { value: "duplicates", labelKey: "filters.duplicates" }
];

export function FilterBar({
  query,
  filter,
  onQueryChange,
  onFilterChange
}: {
  query: string;
  filter: StickerFilter;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: StickerFilter) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          size={20}
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-12 w-full rounded-lg border-line bg-white pl-11 pr-4 text-base font-semibold shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          placeholder={t("search.placeholder")}
          aria-label={t("search.label")}
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label={t("filters.label")}>
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            className={clsx(
              "min-h-11 shrink-0 rounded-lg px-4 text-sm font-black transition",
              filter === item.value
                ? "bg-pitch text-white"
                : "border border-line bg-white text-neutral-700 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300"
            )}
            onClick={() => onFilterChange(item.value)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
