"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Copy, MessageCircle, Share2 } from "lucide-react";
import { Button, Card } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/EmptyState";
import { FriendStickerRow } from "@/features/trades/FriendStickerRow";
import {
  FRIEND_LIST_PREVIEW_LIMIT,
  friendListHref,
  type FriendListType
} from "@/features/trades/friendListTypes";
import { useI18n } from "@/hooks/useI18n";
import { getDuplicateCount } from "@/lib/stickers";
import { formatMyDuplicateBadge } from "@/lib/duplicateLabel";
import { buildFriendTradeMessage, getTradeMatch } from "@/services/tradeQrService";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

export function FriendDetailView({
  friend,
  liveStatus = "idle"
}: {
  friend: TradeFriend;
  liveStatus?: "idle" | "loading" | "live" | "cached";
}) {
  const { language, t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const match = useMemo(() => getTradeMatch(quantities, friend), [friend, quantities]);
  const possibleCount = match.iCanGive.length + match.friendCanGive.length;
  const tradeMessage = useMemo(
    () => buildFriendTradeMessage(friend.name, match.iCanGive, match.friendCanGive, t),
    [friend.name, match.friendCanGive, match.iCanGive, t]
  );
  const importedLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sr-RS", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(friend.importedAt)),
    [friend.importedAt, language]
  );

  async function copyMessage() {
    await navigator.clipboard?.writeText(tradeMessage);
  }

  async function shareMessage() {
    if (navigator.share) {
      await navigator.share({ text: tradeMessage, title: friend.name }).catch(() => undefined);
      return;
    }
    await copyMessage();
  }

  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(tradeMessage)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/trades" className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-pitch">
        <ArrowLeft size={18} />
        {t("friendDetail.backToTrades")}
      </Link>

      <Card className="shadow-lift">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{friend.name}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {liveStatus === "loading"
            ? t("friendDetail.refreshing")
            : liveStatus === "live"
              ? t("friendDetail.liveData")
              : t("friendDetail.importedAt", { date: importedLabel })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatBadge label={t("friendDetail.missingCount", { count: friend.missing.length })} />
          <StatBadge label={t("friendDetail.duplicateCount", { count: friend.duplicates.length })} />
          <StatBadge label={t("friendDetail.possibleCount", { count: possibleCount })} tone="pitch" />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white">{t("friendDetail.messageTitle")}</h2>
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-field p-3 text-sm font-semibold leading-6 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
          {tradeMessage}
        </pre>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Button onClick={copyMessage}>
            <Copy size={18} />
            {t("friendDetail.copyMessage")}
          </Button>
          <Button onClick={shareMessage}>
            <Share2 size={18} />
            {t("friendDetail.shareMessage")}
          </Button>
          <Button onClick={openWhatsApp}>
            <MessageCircle size={18} />
            {t("friendDetail.openWhatsApp")}
          </Button>
        </div>
      </Card>

      <StickerTradeSection
        friendId={friend.id}
        listType="duplicates"
        title={t("friendDetail.friendDuplicates")}
        codes={friend.duplicates}
        emptyTitle={t("friendDetail.noFriendDuplicates")}
      />
      <StickerTradeSection
        friendId={friend.id}
        listType="missing"
        title={t("friendDetail.friendMissing")}
        codes={friend.missing}
        emptyTitle={t("friendDetail.noFriendMissing")}
      />
      <StickerTradeSection
        friendId={friend.id}
        listType="i-can-give"
        title={t("friendDetail.iCanGive")}
        codes={match.iCanGive}
        emptyTitle={t("friendDetail.noICanGive")}
        highlight
        quantities={quantities}
      />
      <StickerTradeSection
        friendId={friend.id}
        listType="friend-can-give"
        title={t("friendDetail.friendCanGiveMe")}
        codes={match.friendCanGive}
        emptyTitle={t("friendDetail.noFriendCanGiveMe")}
        highlight
        quantities={quantities}
      />
    </div>
  );
}

function StatBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "pitch" }) {
  return (
    <span
      className={
        tone === "pitch"
          ? "rounded-lg bg-pitch/10 px-2.5 py-1 text-xs font-black text-pitch"
          : "rounded-lg bg-field px-2.5 py-1 text-xs font-black text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
      }
    >
      {label}
    </span>
  );
}

function StickerTradeSection({
  friendId,
  listType,
  title,
  codes,
  emptyTitle,
  highlight = false,
  quantities
}: {
  friendId: string;
  listType: FriendListType;
  title: string;
  codes: string[];
  emptyTitle: string;
  highlight?: boolean;
  quantities?: Record<string, number>;
}) {
  const { t } = useI18n();
  const previewCodes = codes.slice(0, FRIEND_LIST_PREVIEW_LIMIT);
  const hasMore = codes.length > FRIEND_LIST_PREVIEW_LIMIT;

  function contextLabel(code: string) {
    if (listType === "i-can-give" && quantities) {
      return formatMyDuplicateBadge(t, getDuplicateCount(quantities, code));
    }
    if (listType === "friend-can-give") {
      return t("friendDetail.friendHasDuplicate");
    }
    return null;
  }

  return (
    <Card className={highlight ? "border-pitch/30" : undefined}>
      <div>
        <h2 className="text-lg font-black text-ink dark:text-white">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {t("friendDetail.listCount", { count: codes.length })}
        </p>
      </div>

      {codes.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{emptyTitle}</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            {previewCodes.map((code) => (
              <FriendStickerRow key={code} code={code} contextLabel={contextLabel(code)} />
            ))}
          </div>

          {hasMore ? (
            <>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("friendDetail.previewSummary", {
                  shown: previewCodes.length,
                  total: codes.length
                })}
              </p>
              <Link
                href={friendListHref(friendId, listType)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:w-auto"
              >
                {t("friendDetail.viewAll")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </>
          ) : null}
        </div>
      )}
    </Card>
  );
}

export function FriendNotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        icon={ArrowLeft}
        title={t("friendDetail.notFoundTitle")}
        body={t("friendDetail.notFoundBody")}
        actionLabel={t("friendDetail.backToTrades")}
        actionHref="/trades"
      />
    </div>
  );
}
