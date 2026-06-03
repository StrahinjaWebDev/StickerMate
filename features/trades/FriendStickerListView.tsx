"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/Primitives";
import { FilterBar } from "@/features/stickers/FilterBar";
import { codesToStickers, FriendStickerRow } from "@/features/trades/FriendStickerRow";
import {
  friendListHref,
  getFriendListTitleKey,
  resolveFriendListCodes,
  type FriendListType
} from "@/features/trades/friendListTypes";
import { useI18n } from "@/hooks/useI18n";
import { getDuplicateCount, normalize, teams } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

const allSectionsValue = "__all__";
const featuredSections = ["We Are Panini", "FIFA World Cup 2026", "Host Countries and Cities", "FIFA World Cup History"];

function sectionOptions() {
  const featured = featuredSections.filter((team) => teams.includes(team));
  const rest = teams.filter((team) => !featuredSections.includes(team)).sort((a, b) => a.localeCompare(b));
  return [...featured, ...rest];
}

export function FriendStickerListView({ friend, listType }: { friend: TradeFriend; listType: FriendListType }) {
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState(allSectionsValue);
  const options = useMemo(() => sectionOptions(), []);

  const codes = useMemo(
    () => resolveFriendListCodes(listType, friend, quantities),
    [friend, listType, quantities]
  );

  const filteredStickers = useMemo(() => {
    const normalizedQuery = normalize(query);
    return codesToStickers(codes).filter((sticker) => {
      if (section !== allSectionsValue && sticker.team !== section) return false;
      if (!normalizedQuery) return true;
      return normalize(`${sticker.code} ${sticker.name} ${sticker.team}`).includes(normalizedQuery);
    });
  }, [codes, query, section]);

  const title = t(getFriendListTitleKey(listType));
  const profileHref = `/friends/${encodeURIComponent(friend.id)}`;

  function contextLabel(code: string) {
    if (listType === "i-can-give") {
      const count = getDuplicateCount(quantities, code);
      return t("friendDetail.myDuplicateBadge", { count });
    }
    if (listType === "friend-can-give") {
      return t("friendDetail.friendHasDuplicate");
    }
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link
        href={profileHref}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-pitch"
      >
        <ArrowLeft size={18} />
        {t("friendDetail.backToFriend")}
      </Link>

      <Card className="shadow-lift">
        <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">{friend.name}</p>
        <h1 className="mt-1 text-2xl font-black text-ink dark:text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {t("friendDetail.listCount", { count: codes.length })}
          {filteredStickers.length !== codes.length ? (
            <span>
              {" · "}
              {t("friendDetail.resultCount", { count: filteredStickers.length })}
            </span>
          ) : null}
        </p>
      </Card>

      {codes.length === 0 ? (
        <Card>
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
            {t(
              listType === "duplicates"
                ? "friendDetail.noFriendDuplicates"
                : listType === "missing"
                  ? "friendDetail.noFriendMissing"
                  : listType === "i-can-give"
                    ? "friendDetail.noICanGive"
                    : "friendDetail.noFriendCanGiveMe"
            )}
          </p>
        </Card>
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

          {filteredStickers.length === 0 ? (
            <EmptyState
              icon={ClipboardX}
              title={t("friendDetail.noSearchResults")}
              body={t("friendDetail.noSearchResultsBody")}
            />
          ) : (
            <div className="space-y-1.5 pb-2">
              {filteredStickers.map((sticker) => (
                <FriendStickerRow key={sticker.code} code={sticker.code} contextLabel={contextLabel(sticker.code)} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function FriendListNotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        icon={ArrowLeft}
        title={t("friendDetail.listNotFoundTitle")}
        body={t("friendDetail.listNotFoundBody")}
        actionLabel={t("friendDetail.backToTrades")}
        actionHref="/trades"
      />
    </div>
  );
}

export { friendListHref };
