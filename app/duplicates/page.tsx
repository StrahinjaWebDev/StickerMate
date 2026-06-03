"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/features/stickers/FilterBar";
import { StickerList } from "@/features/stickers/StickerList";
import { useI18n } from "@/hooks/useI18n";
import { filterStickers, getDuplicateCount, stickers, teams } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import { useCollectionStore } from "@/stores/useCollectionStore";

const allSectionsValue = "__all__";
const featuredSections = ["We Are Panini", "FIFA World Cup 2026", "Host Countries and Cities", "FIFA World Cup History"];

function sectionOptions() {
  const featured = featuredSections.filter((team) => teams.includes(team));
  const rest = teams.filter((team) => !featuredSections.includes(team)).sort((a, b) => a.localeCompare(b));
  return [...featured, ...rest];
}

const listHeightClassName =
  "h-[calc(100dvh-17rem-env(safe-area-inset-bottom))] min-h-[280px] max-h-[720px]";

export default function DuplicatesPage() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState(allSectionsValue);
  const quantities = useCollectionStore((state) => state.quantities);
  const { t } = useI18n();
  const options = useMemo(() => sectionOptions(), []);

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

  const sectionList = useMemo(
    () => (section === allSectionsValue ? duplicates : duplicates.filter((sticker) => sticker.team === section)),
    [duplicates, section]
  );

  const duplicateCopies = useMemo(
    () => sectionList.reduce((sum, sticker) => sum + getDuplicateCount(quantities, sticker.code), 0),
    [sectionList, quantities]
  );

  const visibleCount = useMemo(
    () => filterStickers(sectionList, quantities, "all", query).length,
    [quantities, query, sectionList]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("duplicates.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("duplicates.body")}</p>
        {duplicates.length > 0 ? (
          <p className="mt-2 text-sm font-black text-pitch">
            {t("duplicates.ready", { count: duplicateCopies })}
            {section !== allSectionsValue || query.trim() ? (
              <span className="font-bold text-neutral-600 dark:text-neutral-400">
                {" · "}
                {t("duplicates.showing", { count: visibleCount })}
              </span>
            ) : null}
          </p>
        ) : null}
      </section>

      {duplicates.length === 0 ? (
        <EmptyState
          icon={Copy}
          title={t("empty.noDuplicates")}
          body={t("empty.noDuplicatesBody")}
          actionLabel={t("empty.noDuplicatesAction")}
          actionHref="/fill"
        />
      ) : (
        <section className="space-y-3">
          <FilterBar
            query={query}
            filter="all"
            onQueryChange={setQuery}
            onFilterChange={() => undefined}
            showFilters={false}
          />
          <label className="block min-w-0">
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
          <StickerList
            list={sectionList}
            query={query}
            filter="all"
            variant="duplicates"
            heightClassName={listHeightClassName}
          />
        </section>
      )}
    </div>
  );
}
