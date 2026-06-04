"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy, History, MessageCircle, Plus, QrCode, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Badge, Button, Card } from "@/components/ui/Primitives";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useLiveSavedFriends } from "@/hooks/useLiveSavedFriends";
import { useI18n } from "@/hooks/useI18n";
import { removeSavedFriend } from "@/lib/savedFriendActions";
import type { TranslationKey } from "@/lib/i18n";
import { getDuplicateCount, getTradableCount, parseStickerCodes, stickers } from "@/lib/stickers";
import { formatDuplicateLabel } from "@/lib/duplicateLabel";
import { getTeamIcon } from "@/lib/teamIcons";
import { getTradeMatch } from "@/services/tradeQrService";
import { useCollectionStore } from "@/stores/useCollectionStore";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function useDuplicatePreviewLimit() {
  const [limit, setLimit] = useState(4);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setLimit(media.matches ? 6 : 4);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return limit;
}

export default function TradesPage() {
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const friends = useCollectionStore((state) => state.friends);
  const tradeHistory = useCollectionStore((state) => state.tradeHistory);
  const addTradeHistory = useCollectionStore((state) => state.addTradeHistory);
  const deleteTradeHistory = useCollectionStore((state) => state.deleteTradeHistory);
  const undoTradeHistory = useCollectionStore((state) => state.undoTradeHistory);
  const [removeFriendId, setRemoveFriendId] = useState<string | null>(null);
  const [removingFriend, setRemovingFriend] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  useLiveSavedFriends(true);
  const [messageType, setMessageType] = useState<"missing" | "duplicates" | "both">("both");
  const [copied, setCopied] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [giveText, setGiveText] = useState("");
  const [receiveText, setReceiveText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const previewLimit = useDuplicatePreviewLimit();

  const tradable = useMemo(
    () => stickers.filter((sticker) => getTradableCount(quantities, sticker.code) > 0),
    [quantities]
  );
  const missingCodes = useMemo(() => stickers.filter((s) => (quantities[s.code] ?? 0) === 0).map((s) => s.code), [quantities]);
  const duplicateLines = useMemo(
    () => tradable.map((sticker) => `${sticker.code} x${getDuplicateCount(quantities, sticker.code)}`),
    [quantities, tradable]
  );
  const previewStickers = useMemo(() => tradable.slice(0, previewLimit), [previewLimit, tradable]);
  const tradableCopyCount = useMemo(
    () => tradable.reduce((sum, sticker) => sum + getDuplicateCount(quantities, sticker.code), 0),
    [quantities, tradable]
  );

  const whatsAppMessage = useMemo(() => {
    const missingLine = missingCodes.slice(0, 48).join(", ") || "-";
    const duplicateLine = duplicateLines.slice(0, 48).join(", ") || "-";
    if (messageType === "missing") return t("trades.messageMissing", { missing: missingLine });
    if (messageType === "duplicates") return t("trades.messageDuplicates", { duplicates: duplicateLine });
    return t("trades.messageBoth", { missing: missingLine, duplicates: duplicateLine });
  }, [duplicateLines, messageType, missingCodes, t]);
  const whatsAppPreview =
    showFullMessage || whatsAppMessage.length <= 220 ? whatsAppMessage : `${whatsAppMessage.slice(0, 220).trim()}...`;

  async function copyMessage() {
    await navigator.clipboard.writeText(whatsAppMessage);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function shareMessage() {
    if (navigator.share) {
      await navigator.share({ text: whatsAppMessage });
      return;
    }
    await copyMessage();
  }

  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`, "_blank", "noopener,noreferrer");
  }

  function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const given = parseStickerCodes(giveText);
    const received = parseStickerCodes(receiveText);
    if (!friendName.trim()) {
      setError(t("trades.friendNameError"));
      return;
    }
    if (given.length === 0 && received.length === 0) {
      setError(t("trades.codesError"));
      return;
    }

    const invalidGive = given.find((code) => getTradableCount(quantities, code) <= 0);
    if (invalidGive) {
      setError(t("trades.giveDuplicatesOnly"));
      return;
    }

    addTradeHistory({
      date: today(),
      friendName,
      stickersGiven: given,
      stickersReceived: received,
      appliedToCollection: true
    });
    setFriendName("");
    setGiveText("");
    setReceiveText("");
    setError(null);
    setFormOpen(false);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("trades.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("trades.body")}</p>
      </section>

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white">{t("trades.qrSectionTitle")}</h2>
        <p className="mt-1 text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">{t("trades.qrSectionBody")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link
            href="/trade-qr"
            className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-field px-3 text-ink transition active:scale-[0.98] dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white">
              <QrCode size={18} />
            </span>
            <span className="font-black">{t("trades.myQr")}</span>
          </Link>
          <Link
            href="/friend-qr"
            className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-field px-3 text-ink transition active:scale-[0.98] dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white">
              <UserPlus size={18} />
            </span>
            <span className="font-black">{t("trades.scanFriend")}</span>
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white sm:text-xl">{t("trades.myDuplicates")}</h2>
        {tradable.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={Copy}
              title={t("trades.noDuplicates")}
              body={t("trades.noDuplicatesBody")}
              actionLabel={t("trades.noDuplicatesAction")}
              actionHref="/fill"
            />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              {previewStickers.map((sticker) => {
                const duplicateCount = getDuplicateCount(quantities, sticker.code);
                return (
                  <div
                    key={sticker.code}
                    className="flex min-w-0 items-center gap-2.5 rounded-lg bg-field p-2 dark:bg-neutral-950 sm:gap-3"
                  >
                    <StickerImage
                      sticker={sticker}
                      quantity={quantities[sticker.code] ?? 0}
                      className="h-12 w-9 shrink-0 sm:h-14 sm:w-10"
                      showTextPlaceholder={false}
                      sizes="40px"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-ink dark:text-white">
                        <span className="text-neutral-500 dark:text-neutral-400">{sticker.code}</span> {sticker.name}
                      </p>
                      <p className="truncate text-xs font-bold text-neutral-500 dark:text-neutral-400">
                        <span className="mr-1">{getTeamIcon(sticker.team)}</span>
                        {sticker.team}
                      </p>
                    </div>
                    <Badge tone="gold" className="shrink-0 whitespace-nowrap text-[11px]">
                      {formatDuplicateLabel(t, duplicateCount)}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {tradable.length > previewLimit ? (
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("trades.duplicatesPreviewSummary", {
                  shown: previewStickers.length,
                  total: tradableCopyCount
                })}
              </p>
            ) : null}

            <Link
              href="/duplicates"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:w-auto"
            >
              {t("trades.viewAllDuplicates")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.whatsappTitle")}</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["missing", "duplicates", "both"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={
                messageType === type
                  ? "min-h-10 shrink-0 rounded-lg bg-pitch px-3 text-sm font-black text-white"
                  : "min-h-10 shrink-0 rounded-lg border border-line bg-white px-3 text-sm font-black text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300"
              }
              onClick={() => setMessageType(type)}
            >
              {t(`trades.messageType.${type}` as TranslationKey)}
            </button>
          ))}
        </div>
        <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-field p-3 text-sm font-semibold leading-6 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
          {whatsAppPreview}
        </pre>
        {whatsAppMessage !== whatsAppPreview ? (
          <Button className="mt-2 min-h-10 px-3 text-sm" onClick={() => setShowFullMessage(true)}>
            {t("trades.showFullMessage")}
          </Button>
        ) : showFullMessage ? (
          <Button className="mt-2 min-h-10 px-3 text-sm" onClick={() => setShowFullMessage(false)}>
            {t("trades.showLess")}
          </Button>
        ) : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Button onClick={copyMessage}>
            <Copy size={18} />
            {copied ? t("common.copied") : t("trades.copyMessage")}
          </Button>
          <Button onClick={shareMessage}>
            <MessageCircle size={18} />
            {t("common.share")}
          </Button>
          <Button onClick={openWhatsApp}>
            <MessageCircle size={18} />
            {t("trades.openWhatsApp")}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.friendsTitle")}</h2>
        {friends.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={UserPlus}
              title={t("trades.noFriends")}
              body={t("trades.noFriendsBody")}
              actionLabel={t("trades.noFriendsAction")}
              actionHref="/friend-qr"
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            {friends.map((friend) => {
              const match = getTradeMatch(quantities, friend);
              const possibleCount = match.iCanGive.length + match.friendCanGive.length;
              return (
                <article key={friend.id} className="rounded-lg bg-field p-3 dark:bg-neutral-950">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-black text-ink dark:text-white">{friend.name}</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                        {t("tradeQr.missingCount", { count: friend.missing.length })} ·{" "}
                        {t("tradeQr.duplicateCount", { count: friend.duplicates.length })} ·{" "}
                        {t("trades.possibleTrades", { count: possibleCount })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:w-56">
                      <Link
                        href={`/friends/${encodeURIComponent(friend.id)}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-pitch px-3 text-center text-sm font-black text-white"
                      >
                        {t("trades.viewMatches")}
                      </Link>
                      <Button className="min-h-10 px-2 text-xs" tone="danger" onClick={() => setRemoveFriendId(friend.id)}>
                        <Trash2 size={15} />
                        {t("trades.removeFriend")}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.manualTitle")}</h2>
          <Button tone="primary" onClick={() => setFormOpen((current) => !current)}>
            <Plus size={18} />
            {t("trades.newTrade")}
          </Button>
        </div>
        {formOpen ? (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submitTrade}>
            <TradeField label={t("trades.friendName")} className="sm:col-span-2">
              <input
                value={friendName}
                onChange={(event) => setFriendName(event.target.value)}
                className="w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </TradeField>
            <TradeField label={t("trades.iGive")} hint={t("trades.giveHelper")}>
              <textarea
                value={giveText}
                onChange={(event) => setGiveText(event.target.value)}
                className="min-h-24 w-full rounded-lg border-line bg-field font-mono text-sm font-bold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                placeholder="MEX1 BRA14"
              />
            </TradeField>
            <TradeField label={t("trades.iReceive")}>
              <textarea
                value={receiveText}
                onChange={(event) => setReceiveText(event.target.value)}
                className="min-h-24 w-full rounded-lg border-line bg-field font-mono text-sm font-bold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                placeholder="BRA14 ARG17"
              />
            </TradeField>
            {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral sm:col-span-2">{error}</p> : null}
            <Button tone="primary" type="submit" className="sm:col-span-2">
              <Check size={18} />
              {t("trades.saveTrade")}
            </Button>
          </form>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.history")}</h2>
        {tradeHistory.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={History}
              title={t("trades.noHistory")}
              body={t("trades.noHistoryBody")}
              actionLabel={t("trades.noHistoryAction")}
              onAction={() => setFormOpen(true)}
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {tradeHistory.map((trade) => (
              <article key={trade.id} className="rounded-lg bg-field p-3 dark:bg-neutral-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-ink dark:text-white">{trade.friendName}</p>
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">{trade.date}</p>
                    <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {t("trades.iGive")}: {trade.stickersGiven.join(", ") || "-"}
                    </p>
                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {t("trades.iReceive")}: {trade.stickersReceived.join(", ") || "-"}
                    </p>
                    {trade.note ? (
                      <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                        {t("spending.note")}: {trade.note}
                      </p>
                    ) : null}
                    {trade.undoneAt ? (
                      <Badge tone="danger" className="mt-2">
                        {t("trades.undone")}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:w-40">
                    <Button
                      className="min-h-10 px-2 text-sm"
                      disabled={!trade.appliedToCollection || Boolean(trade.undoneAt)}
                      onClick={() => undoTradeHistory(trade.id)}
                    >
                      <RotateCcw size={16} />
                      {t("trades.undo")}
                    </Button>
                    <Button className="min-h-10 px-2 text-sm" tone="danger" onClick={() => deleteTradeHistory(trade.id)}>
                      <Trash2 size={16} />
                      {t("spending.deleteShort")}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      {removeError ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral">{removeError}</p> : null}

      <ConfirmDialog
        open={Boolean(removeFriendId)}
        title={t("trades.removeFriendTitle")}
        body={t("trades.removeFriendBody")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("trades.removeFriendConfirm")}
        confirmTone="danger"
        onCancel={() => {
          if (!removingFriend) setRemoveFriendId(null);
        }}
        onConfirm={() => {
          if (!removeFriendId || removingFriend) return;
          setRemovingFriend(true);
          setRemoveError(null);
          void (async () => {
            const synced = await removeSavedFriend(removeFriendId);
            setRemovingFriend(false);
            setRemoveFriendId(null);
            if (!synced) setRemoveError(t("trades.removeFriendFailed"));
          })();
        }}
      />
    </div>
  );
}

function TradeField({
  children,
  className,
  hint,
  label
}: {
  children: React.ReactNode;
  className?: string;
  hint?: string;
  label: string;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-black text-ink dark:text-white">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">{hint}</span> : null}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
