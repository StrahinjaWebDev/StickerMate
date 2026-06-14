"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Copy, MessageCircle, Search, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Primitives";
import {
  ManualTradeStickerPicker,
  type ManualTradePickerFilter,
  type ManualTradePickerTarget
} from "@/features/trades/ManualTradeStickerPicker";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/lib/i18n";
import {
  buildManualTradeProposalMessage,
  codesToTradeText,
  validateManualTradeCodes
} from "@/lib/manualTrade";
import { parseStickerCodes } from "@/lib/stickers";
import { buildMessagePreview, isMessagePreviewShortened } from "@/lib/tradeMessages";
import { useCollectionStore } from "@/stores/useCollectionStore";

type PendingAction = "save" | "proposal-copy" | "proposal-share" | "proposal-whatsapp";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ManualTradeForm({ onSaved }: { onSaved: () => void }) {
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const addTradeHistory = useCollectionStore((state) => state.addTradeHistory);

  const [friendName, setFriendName] = useState("");
  const [giveCodes, setGiveCodes] = useState<string[]>([]);
  const [receiveCodes, setReceiveCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [proposalCopied, setProposalCopied] = useState(false);
  const [showFullProposal, setShowFullProposal] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFilter, setPickerFilter] = useState<ManualTradePickerFilter>("all");
  const [pickerTarget, setPickerTarget] = useState<ManualTradePickerTarget>("give");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [albumCopyWarnings, setAlbumCopyWarnings] = useState<string[]>([]);

  const validation = useMemo(
    () => validateManualTradeCodes(giveCodes, receiveCodes, quantities),
    [giveCodes, quantities, receiveCodes]
  );

  const proposalMessage = useMemo(
    () => buildManualTradeProposalMessage(validation.given, validation.received, t),
    [t, validation.given, validation.received]
  );
  const proposalPreview = useMemo(
    () => buildMessagePreview(proposalMessage, showFullProposal),
    [proposalMessage, showFullProposal]
  );
  const isProposalPreviewShortened = isMessagePreviewShortened(proposalMessage, proposalPreview);

  const hasProposalContent = validation.given.length > 0 || validation.received.length > 0;

  function openPicker(filter: ManualTradePickerFilter, target: ManualTradePickerTarget) {
    setPickerFilter(filter);
    setPickerTarget(target);
    setPickerOpen(true);
  }

  function addCode(code: string, target: ManualTradePickerTarget) {
    if (target === "give") {
      setGiveCodes((current) => [...current, code]);
      return;
    }
    setReceiveCodes((current) => [...current, code]);
  }

  function removeCode(target: ManualTradePickerTarget, index: number) {
    if (target === "give") {
      setGiveCodes((current) => current.filter((_, currentIndex) => currentIndex !== index));
      return;
    }
    setReceiveCodes((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function runValidation(action: PendingAction): boolean {
    setError(null);

    if (validation.given.length === 0 && validation.received.length === 0) {
      setError(t("trades.codesError"));
      return false;
    }

    const invalidCodes = [...validation.invalidGiven, ...validation.invalidReceived];
    if (invalidCodes.length > 0) {
      setError(t("trades.invalidCodesError", { codes: invalidCodes.join(", ") }));
      return false;
    }

    if (validation.insufficientGiven.length > 0) {
      const first = validation.insufficientGiven[0];
      setError(
        t("trades.insufficientGiveError", {
          code: first.code,
          available: first.available,
          requested: first.requested
        })
      );
      return false;
    }

    if (validation.albumCopyWarnings.length > 0) {
      setAlbumCopyWarnings(validation.albumCopyWarnings);
      setPendingAction(action);
      setConfirmOpen(true);
      return false;
    }

    return true;
  }

  function saveTrade(allowAlbumGive: boolean) {
    addTradeHistory({
      date: today(),
      friendName: friendName.trim() || t("trades.manualTradeDefaultName"),
      stickersGiven: validation.given,
      stickersReceived: validation.received,
      appliedToCollection: true,
      allowAlbumGive
    });
    setFriendName("");
    setGiveCodes([]);
    setReceiveCodes([]);
    setError(null);
    onSaved();
  }

  function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runValidation("save")) return;
    saveTrade(false);
  }

  async function copyProposal() {
    if (!runValidation("proposal-copy")) return;
    await navigator.clipboard.writeText(proposalMessage);
    setProposalCopied(true);
    window.setTimeout(() => setProposalCopied(false), 1500);
  }

  async function shareProposal() {
    if (!runValidation("proposal-share")) return;
    if (navigator.share) {
      await navigator.share({ text: proposalMessage });
      return;
    }
    await copyProposal();
  }

  function openProposalWhatsApp() {
    if (!runValidation("proposal-whatsapp")) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(proposalMessage)}`, "_blank", "noopener,noreferrer");
  }

  function confirmPendingAction() {
    if (!pendingAction) return;

    if (pendingAction === "save") {
      saveTrade(true);
    } else if (pendingAction === "proposal-copy") {
      void navigator.clipboard.writeText(proposalMessage).then(() => {
        setProposalCopied(true);
        window.setTimeout(() => setProposalCopied(false), 1500);
      });
    } else if (pendingAction === "proposal-share") {
      if (navigator.share) {
        void navigator.share({ text: proposalMessage });
      } else {
        void navigator.clipboard.writeText(proposalMessage);
      }
    } else if (pendingAction === "proposal-whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(proposalMessage)}`, "_blank", "noopener,noreferrer");
    }

    setConfirmOpen(false);
    setPendingAction(null);
    setAlbumCopyWarnings([]);
  }

  return (
    <>
      <form className="mt-4 grid gap-4" onSubmit={submitTrade}>
        <TradeField label={t("trades.friendNameOptional")}>
          <input
            value={friendName}
            onChange={(event) => setFriendName(event.target.value)}
            className="w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            placeholder={t("trades.manualTradeDefaultName")}
          />
        </TradeField>

        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-10 px-3 text-sm" onClick={() => openPicker("duplicates", "give")}>
            {t("trades.insertDuplicates")}
          </Button>
          <Button type="button" className="min-h-10 px-3 text-sm" onClick={() => openPicker("missing", "receive")}>
            {t("trades.insertMissing")}
          </Button>
          <Button type="button" className="min-h-10 px-3 text-sm" onClick={() => openPicker("all", "give")}>
            <Search size={16} />
            {t("trades.searchStickers")}
          </Button>
        </div>

        <CodeListField
          chips={giveCodes}
          hint={t("trades.giveHelper")}
          label={t("trades.iGive")}
          onRemove={(index) => removeCode("give", index)}
          onTextChange={(text) => setGiveCodes(parseStickerCodes(text))}
          placeholder="MEX1 BRA14"
          text={codesToTradeText(giveCodes)}
        />

        <CodeListField
          chips={receiveCodes}
          label={t("trades.iReceive")}
          onRemove={(index) => removeCode("receive", index)}
          onTextChange={(text) => setReceiveCodes(parseStickerCodes(text))}
          placeholder="BRA14 ARG17"
          text={codesToTradeText(receiveCodes)}
        />

        {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral">{error}</p> : null}

        <section className="rounded-lg border border-line bg-field p-4 dark:border-white/10 dark:bg-neutral-950">
          <h3 className="text-base font-black text-ink dark:text-white">{t("trades.manualProposalTitle")}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
            {t("trades.manualProposalBody")}
          </p>
          {hasProposalContent ? (
            <>
              {isProposalPreviewShortened ? (
                <p className="mt-3 text-xs font-semibold text-neutral-600 dark:text-neutral-400">{t("trades.messagePreviewHint")}</p>
              ) : null}
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                {proposalPreview}
              </pre>
              {isProposalPreviewShortened ? (
                <Button type="button" className="mt-2 min-h-10 px-3 text-sm" onClick={() => setShowFullProposal(true)}>
                  {t("trades.showFullMessage")}
                </Button>
              ) : showFullProposal && proposalMessage.length > 220 ? (
                <Button type="button" className="mt-2 min-h-10 px-3 text-sm" onClick={() => setShowFullProposal(false)}>
                  {t("trades.showLess")}
                </Button>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("trades.manualProposalEmpty")}</p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Button type="button" className="min-h-11" disabled={!hasProposalContent} onClick={() => void copyProposal()}>
              <Copy size={18} />
              {proposalCopied ? t("common.copied") : t("trades.copyProposal")}
            </Button>
            <Button type="button" className="min-h-11" disabled={!hasProposalContent} onClick={() => void shareProposal()}>
              <MessageCircle size={18} />
              {t("common.share")}
            </Button>
            <Button type="button" className="min-h-11" disabled={!hasProposalContent} onClick={openProposalWhatsApp}>
              <MessageCircle size={18} />
              {t("trades.openWhatsApp")}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-pitch/20 bg-pitch/5 p-4 dark:border-pitch/30 dark:bg-pitch/10">
          <h3 className="text-base font-black text-ink dark:text-white">{t("trades.confirmTradeTitle")}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
            {t("trades.confirmTradeBody")}
          </p>
          <Button tone="primary" type="submit" className="mt-3 w-full sm:w-auto">
            <Check size={18} />
            {t("trades.saveTrade")}
          </Button>
        </section>
      </form>

      <ManualTradeStickerPicker
        filter={pickerFilter}
        open={pickerOpen}
        quantities={quantities}
        target={pickerTarget}
        onClose={() => setPickerOpen(false)}
        onSelect={(code) => addCode(code, pickerTarget)}
        onTargetChange={setPickerTarget}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={t("trades.albumCopyWarningTitle")}
        body={t("trades.albumCopyWarningBody", { codes: albumCopyWarnings.join(", ") })}
        cancelLabel={t("common.cancel")}
        confirmLabel={pendingAction === "save" ? t("trades.albumCopyConfirm") : t("trades.proposalAlbumConfirm")}
        confirmTone="danger"
        onCancel={() => {
          setConfirmOpen(false);
          setPendingAction(null);
          setAlbumCopyWarnings([]);
        }}
        onConfirm={confirmPendingAction}
      />
    </>
  );
}

function CodeListField({
  chips,
  hint,
  label,
  onRemove,
  onTextChange,
  placeholder,
  text
}: {
  chips: string[];
  hint?: string;
  label: string;
  onRemove: (index: number) => void;
  onTextChange: (text: string) => void;
  placeholder: string;
  text: string;
}) {
  return (
    <TradeField hint={hint} label={label}>
      {chips.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((code, index) => (
            <span
              key={`${code}-${index}`}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-pitch/10 px-2 py-1 text-xs font-black text-pitch"
            >
              <span className="truncate">{code}</span>
              <button
                type="button"
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-pitch/15"
                aria-label={`Remove ${code}`}
                onClick={() => onRemove(index)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        className="min-h-24 w-full rounded-lg border-line bg-field font-mono text-sm font-bold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
        placeholder={placeholder}
      />
    </TradeField>
  );
}

function TradeField({
  children,
  hint,
  label
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-ink dark:text-white">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">{hint}</span> : null}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export function buildHistoryProposalMessage(
  trade: { stickersGiven: string[]; stickersReceived: string[] },
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  return buildManualTradeProposalMessage(trade.stickersGiven, trade.stickersReceived, t);
}
