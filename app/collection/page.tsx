"use client";

import { useEffect, useMemo, useState } from "react";
import { GuideCard } from "@/components/GuideCard";
import { BulkActions } from "@/features/stickers/BulkActions";
import { FilterBar } from "@/features/stickers/FilterBar";
import { StickerGrid } from "@/features/stickers/StickerGrid";
import { StickerList } from "@/features/stickers/StickerList";
import { ViewModeSwitch } from "@/features/stickers/ViewModeSwitch";
import { useI18n } from "@/hooks/useI18n";
import { filterStickers, getStats, stickers, teams } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { StickerFilter } from "@/types/sticker";
import type { TranslationKey } from "@/lib/i18n";

const allSectionsValue = "__all__";
const featuredSections = ["We Are Panini", "FIFA World Cup 2026", "Host Countries and Cities", "FIFA World Cup History"];
const filterLabelKeys: Record<StickerFilter, TranslationKey> = {
  all: "filters.all",
  owned: "filters.owned",
  missing: "filters.missing",
  duplicates: "filters.duplicates"
};

function sectionOptions() {
  const featured = featuredSections.filter((team) => teams.includes(team));
  const rest = teams.filter((team) => !featuredSections.includes(team)).sort((a, b) => a.localeCompare(b));
  return [...featured, ...rest];
}

export default function CollectionPage() {
  const viewMode = useCollectionStore((state) => state.viewMode);
  const setViewMode = useCollectionStore((state) => state.setViewMode);
  const quantities = useCollectionStore((state) => state.quantities);
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StickerFilter>("all");
  const [section, setSection] = useState(allSectionsValue);
  const options = useMemo(() => sectionOptions(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get("section");
    if (sectionParam && options.includes(sectionParam)) setSection(sectionParam);
  }, [options]);

  const sectionList = useMemo(
    () => (section === allSectionsValue ? stickers : stickers.filter((sticker) => sticker.team === section)),
    [section]
  );
  const sectionStats = useMemo(() => getStats(quantities, sectionList), [quantities, sectionList]);
  const resultCount = useMemo(
    () => filterStickers(sectionList, quantities, filter, query).length,
    [filter, quantities, query, sectionList]
  );
  const selectedSectionLabel = section === allSectionsValue ? t("filters.allSections") : `${getTeamIcon(section)} ${section}`;
  const summary =
    section === allSectionsValue && filter === "all" && !query.trim()
      ? t("filters.summaryAll", { owned: sectionStats.owned, total: sectionStats.total })
      : section !== allSectionsValue && filter === "all" && !query.trim()
        ? t("filters.summarySection", {
            section: selectedSectionLabel,
            owned: sectionStats.owned,
            total: sectionStats.total
          })
      : t("filters.summaryFiltered", {
          filter: t(filterLabelKeys[filter]),
          section: selectedSectionLabel,
          count: resultCount
        });

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-white p-3 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("collection.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("collection.body")}</p>
      </section>

      <GuideCard guide="collection" titleKey="guide.collectionTitle" bodyKey="guide.collectionBody" />

      <section className="space-y-2 pb-4">
        <FilterBar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <label className="min-w-0">
            <span className="sr-only">{t("filters.section")}</span>
            <select
              value={section}
              onChange={(event) => setSection(event.target.value)}
              className="h-11 w-full rounded-lg border-line bg-white px-3 text-sm font-black text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              aria-label={t("filters.section")}
            >
              <option value={allSectionsValue}>{t("filters.allSections")}</option>
              {options.map((team) => (
                <option key={team} value={team}>
                  {getTeamIcon(team)} {team}
                </option>
              ))}
            </select>
          </label>
          <ViewModeSwitch value={viewMode} onChange={setViewMode} />
        </div>
        <div className="flex flex-col gap-2 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{summary}</span>
          {section !== allSectionsValue || filter !== "all" || query.trim() ? (
            <button
              type="button"
              className="min-h-9 self-start rounded-md px-2 text-xs font-black text-pitch hover:bg-white dark:hover:bg-neutral-900 sm:self-auto"
              onClick={() => {
                setSection(allSectionsValue);
                setFilter("all");
                setQuery("");
              }}
            >
              {t("filters.clear")}
            </button>
          ) : null}
        </div>
        <BulkActions />
        {viewMode === "list" ? (
          <StickerList list={sectionList} query={query} filter={filter} heightClassName="h-[calc(100dvh-19rem)] min-h-[320px] max-h-[720px]" />
        ) : (
          <StickerGrid list={sectionList} query={query} filter={filter} heightClassName="h-[calc(100dvh-19rem)] min-h-[320px] max-h-[720px]" />
        )}
      </section>
    </div>
  );
}
