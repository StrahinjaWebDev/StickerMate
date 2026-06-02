"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Copy, MessageCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/Primitives";
import { GuideCard } from "@/components/GuideCard";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/lib/i18n";
import { getDuplicateCount, getMissingCodes, getTradableCount, parseStickerCodes, stickers } from "@/lib/stickers";
import { getTeamIcon } from "@/lib/teamIcons";
import { useCollectionStore } from "@/stores/useCollectionStore";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function TradesPage() {
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const friends = useCollectionStore((state) => state.friends);
  const tradeHistory = useCollectionStore((state) => state.tradeHistory);
  const addTradeHistory = useCollectionStore((state) => state.addTradeHistory);
  const deleteTradeHistory = useCollectionStore((state) => state.deleteTradeHistory);
  const undoTradeHistory = useCollectionStore((state) => state.undoTradeHistory);
  const [messageType, setMessageType] = useState<"missing" | "duplicates" | "both">("both");
  const [copied, setCopied] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [giveText, setGiveText] = useState("");
  const [receiveText, setReceiveText] = useState("");
  const [note, setNote] = useState("");
  const [applyToCollection, setApplyToCollection] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tradable = useMemo(
    () => stickers.filter((sticker) => getTradableCount(quantities, sticker.code) > 0),
    [quantities]
  );
  const missingCodes = useMemo(() => getMissingCodes(quantities), [quantities]);
  const duplicateLines = useMemo(
    () => tradable.map((sticker) => `${sticker.code} x${getDuplicateCount(quantities, sticker.code)}`),
    [quantities, tradable]
  );

  const whatsAppMessage = useMemo(() => {
    const missingLine = missingCodes.slice(0, 120).join(", ") || "-";
    const duplicateLine = duplicateLines.slice(0, 120).join(", ") || "-";
    if (messageType === "missing") return t("trades.messageMissing", { missing: missingLine });
    if (messageType === "duplicates") return t("trades.messageDuplicates", { duplicates: duplicateLine });
    return t("trades.messageBoth", { missing: missingLine, duplicates: duplicateLine });
  }, [duplicateLines, messageType, missingCodes, t]);

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
    if (applyToCollection) {
      const invalidGive = given.find((code) => getTradableCount(quantities, code) <= 0);
      if (invalidGive) {
        setError(t("trades.giveError", { code: invalidGive }));
        return;
      }
    }

    addTradeHistory({
      date: today(),
      friendName,
      stickersGiven: given,
      stickersReceived: received,
      note,
      appliedToCollection: applyToCollection
    });
    setFriendName("");
    setGiveText("");
    setReceiveText("");
    setNote("");
    setError(null);
    setFormOpen(false);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("trades.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("trades.body")}</p>
      </section>

      <GuideCard guide="trades" titleKey="guide.tradesTitle" bodyKey="guide.tradesBody" />

      <section className="grid min-w-0 gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.myDuplicates")}</h2>
          {tradable.length === 0 ? (
            <p className="mt-3 rounded-lg bg-field p-3 text-sm font-bold text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">
              {t("trades.noDuplicates")}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {tradable.slice(0, 8).map((sticker) => (
                <div key={sticker.code} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-field p-3 dark:bg-neutral-950">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-ink dark:text-white">{sticker.code} · {sticker.name}</p>
                    <p className="truncate text-xs font-bold text-neutral-500 dark:text-neutral-400">
                      <span className="mr-1">{getTeamIcon(sticker.team)}</span>{sticker.team}
                    </p>
                  </div>
                  <Badge tone="gold" className="shrink-0">
                    {t(
                      getDuplicateCount(quantities, sticker.code) === 1 ? "status.duplicateOne" : "status.duplicateMany",
                      { count: getDuplicateCount(quantities, sticker.code) }
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.missingList")}</h2>
          <p className="mt-3 max-h-44 overflow-auto break-words rounded-lg bg-field p-3 font-mono text-xs font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
            {missingCodes.slice(0, 160).join(", ") || "-"}
          </p>
          <Button className="mt-3 w-full" onClick={() => navigator.clipboard.writeText(missingCodes.join(", "))}>
            <Copy size={18} />
            {t("trades.copyMissing")}
          </Button>
        </Card>
      </section>

      <Card>
        <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.whatsappTitle")}</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["missing", "duplicates", "both"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={messageType === type ? "min-h-10 shrink-0 rounded-lg bg-pitch px-3 text-sm font-black text-white" : "min-h-10 shrink-0 rounded-lg border border-line bg-white px-3 text-sm font-black text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300"}
              onClick={() => setMessageType(type)}
            >
              {t(`trades.messageType.${type}` as TranslationKey)}
            </button>
          ))}
        </div>
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-field p-3 text-sm font-semibold leading-6 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
          {whatsAppMessage}
        </pre>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Button onClick={copyMessage}><Copy size={18} />{copied ? t("common.copied") : t("trades.copyMessage")}</Button>
          <Button onClick={shareMessage}><MessageCircle size={18} />{t("common.share")}</Button>
          <Button onClick={openWhatsApp}><MessageCircle size={18} />{t("trades.openWhatsApp")}</Button>
        </div>
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
            <TradeField label={t("trades.friendName")}>
              <input value={friendName} onChange={(event) => setFriendName(event.target.value)} className="w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white" />
            </TradeField>
            <TradeField label={t("trades.applyToCollection")}>
              <label className="flex min-h-11 items-center gap-2 rounded-lg bg-field px-3 font-bold text-ink dark:bg-neutral-950 dark:text-white">
                <input type="checkbox" checked={applyToCollection} onChange={(event) => setApplyToCollection(event.target.checked)} />
                {t("trades.safeApply")}
              </label>
            </TradeField>
            <TradeField label={t("trades.iGive")}>
              <textarea value={giveText} onChange={(event) => setGiveText(event.target.value)} className="min-h-24 w-full rounded-lg border-line bg-field font-mono text-sm font-bold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white" placeholder="MEX1 BRA14" />
            </TradeField>
            <TradeField label={t("trades.iReceive")}>
              <textarea value={receiveText} onChange={(event) => setReceiveText(event.target.value)} className="min-h-24 w-full rounded-lg border-line bg-field font-mono text-sm font-bold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white" placeholder="BRA14 ARG17" />
            </TradeField>
            <TradeField label={t("spending.note")} className="sm:col-span-2">
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white" />
            </TradeField>
            {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral sm:col-span-2">{error}</p> : null}
            <Button tone="primary" type="submit" className="sm:col-span-2"><Check size={18} />{t("trades.saveTrade")}</Button>
          </form>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.history")}</h2>
        {tradeHistory.length === 0 ? (
          <p className="mt-3 rounded-lg bg-field p-3 text-sm font-bold text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">
            {t("trades.noHistory")}
          </p>
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
                    {trade.undoneAt ? <Badge tone="danger" className="mt-2">{t("trades.undone")}</Badge> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:w-40">
                    <Button className="min-h-10 px-2 text-sm" disabled={!trade.appliedToCollection || Boolean(trade.undoneAt)} onClick={() => undoTradeHistory(trade.id)}>
                      <RotateCcw size={16} />{t("trades.undo")}
                    </Button>
                    <Button className="min-h-10 px-2 text-sm" tone="danger" onClick={() => deleteTradeHistory(trade.id)}>
                      <Trash2 size={16} />{t("spending.deleteShort")}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      {friends.length > 0 ? (
        <Card>
          <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.friendsTitle")}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {friends.map((friend) => (
              <div key={friend.id} className="rounded-lg bg-field p-3 dark:bg-neutral-950">
                <p className="font-black text-ink dark:text-white">{friend.name}</p>
                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  {t("tradeQr.missingCount", { count: friend.missing.length })} · {t("tradeQr.duplicateCount", { count: friend.duplicates.length })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function TradeField({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <label className={className}>
      <span className="text-sm font-black text-ink dark:text-white">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
