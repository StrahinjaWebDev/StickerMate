"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, MessageCircle, Share2 } from "lucide-react";
import { Button, Card } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/EmptyState";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
import { stickerByCode } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import { buildFriendTradeMessage, getTradeMatch } from "@/services/tradeQrService";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend } from "@/types/sticker";

const previewLimit = 40;

export function FriendDetailView({ friend }: { friend: TradeFriend }) {
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
      <Link
        href="/trades"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-pitch"
      >
        <ArrowLeft size={18} />
        {t("friendDetail.backToTrades")}
      </Link>

      <Card className="shadow-lift">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{friend.name}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {t("friendDetail.importedAt", { date: importedLabel })}
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
            {t("friendDetail.shareRequest")}
          </Button>
          <Button onClick={openWhatsApp}>
            <MessageCircle size={18} />
            {t("friendDetail.openWhatsApp")}
          </Button>
        </div>
      </Card>

      <StickerTradeSection
        title={t("friendDetail.friendDuplicates")}
        codes={friend.duplicates}
        emptyTitle={t("friendDetail.noFriendDuplicates")}
      />
      <StickerTradeSection
        title={t("friendDetail.friendMissing")}
        codes={friend.missing}
        emptyTitle={t("friendDetail.noFriendMissing")}
      />
      <StickerTradeSection
        title={t("friendDetail.iCanGive")}
        codes={match.iCanGive}
        emptyTitle={t("friendDetail.noICanGive")}
        highlight
      />
      <StickerTradeSection
        title={t("friendDetail.friendCanGiveMe")}
        codes={match.friendCanGive}
        emptyTitle={t("friendDetail.noFriendCanGiveMe")}
        highlight
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
  title,
  codes,
  emptyTitle,
  highlight = false
}: {
  title: string;
  codes: string[];
  emptyTitle: string;
  highlight?: boolean;
}) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const visibleCodes = showAll ? codes : codes.slice(0, previewLimit);

  async function copyCodes() {
    if (codes.length === 0) return;
    await navigator.clipboard?.writeText(codes.join(", "));
  }

  return (
    <Card className={highlight ? "border-pitch/30" : undefined}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-ink dark:text-white">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
            {t("friendDetail.listCount", { count: codes.length })}
          </p>
        </div>
        {codes.length > 0 ? (
          <Button className="min-h-9 shrink-0 px-3 text-sm" onClick={copyCodes}>
            <Copy size={16} />
            {t("friendDetail.copyList")}
          </Button>
        ) : null}
      </div>

      {codes.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{emptyTitle}</p>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {visibleCodes.map((code) => (
              <StickerTradeItem key={code} code={code} />
            ))}
          </div>
          {codes.length > previewLimit ? (
            <Button className="mt-3 min-h-10 px-3 text-sm" onClick={() => setShowAll((current) => !current)}>
              {showAll ? t("trades.showLess") : t("trades.showAll")}
            </Button>
          ) : null}
        </>
      )}
    </Card>
  );
}

function StickerTradeItem({ code }: { code: string }) {
  const sticker = stickerByCode.get(code);
  if (!sticker) {
    return (
      <div className="rounded-lg bg-field px-3 py-2 font-mono text-sm font-black text-ink dark:bg-neutral-950 dark:text-white">
        {code}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-field p-2 dark:bg-neutral-950">
      <StickerImage
        sticker={sticker}
        quantity={1}
        className="h-14 w-10 shrink-0"
        showTextPlaceholder={false}
        sizes="40px"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-ink dark:text-white">
          {sticker.code} · {sticker.name}
        </p>
        <p className="truncate text-xs font-bold text-neutral-500 dark:text-neutral-400">
          <span className="mr-1">{getTeamIcon(sticker.team)}</span>
          {sticker.team}
        </p>
      </div>
    </div>
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
