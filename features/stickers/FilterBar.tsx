"use client";

import { Search } from "lucide-react";
import { clsx } from "clsx";
import type { StickerFilter } from "@/types/sticker";

const filters: Array<{ value: StickerFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "missing", label: "Missing" },
  { value: "duplicates", label: "Duplicates" }
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
          placeholder="Search code, player, team..."
          aria-label="Search stickers"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Sticker filters">
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
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
