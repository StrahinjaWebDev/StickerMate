"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ClipboardPaste, Copy, ImageUp, QrCode, Save } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { FriendQrScanner, releaseScannerStream } from "@/components/FriendQrScanner";
import { Button, Card } from "@/components/ui/Primitives";
import { StatusMessage } from "@/components/StatusMessage";
import { useI18n } from "@/hooks/useI18n";
import { importSavedFriend } from "@/lib/savedFriendActions";
import { cameraErrorMessageKey, QrCameraError, requestQrCameraStream } from "@/lib/qrCamera";
import { friendFromTradeProfile } from "@/lib/tradeShareService";
import { getTradeMatch, parseTradeProfilePayload, QrImageNotFoundError, readQrFromImageFile } from "@/services/tradeQrService";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeProfilePayload } from "@/types/sticker";

const galleryAccept = "image/png,image/jpeg,image/jpg,image/webp,image/*";

export default function FriendQrPage() {
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const friends = useCollectionStore((state) => state.friends);
  const [importing, setImporting] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [payload, setPayload] = useState<TradeProfilePayload | null>(null);
  const [savedFriendId, setSavedFriendId] = useState<string | null>(null);
  const [importWasUpdate, setImportWasUpdate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStream, setScannerStream] = useState<MediaStream | null>(null);
  const [scannerBooting, setScannerBooting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const existingFriend = payload
    ? friends.find(
        (item) =>
          (payload.shareId && item.shareId === payload.shareId) ||
          item.name.toLowerCase() === payload.name.toLowerCase()
      )
    : undefined;
  const savedFriend = savedFriendId
    ? friends.find((item) => item.id === savedFriendId) ?? null
    : null;
  const displayFriend = savedFriend;
  const match = useMemo(
    () => (displayFriend ? getTradeMatch(quantities, displayFriend) : null),
    [displayFriend, quantities]
  );
  const urlParsedRef = useRef(false);

  const applyTradeInput = useCallback(
    (text: string, shareIdFromUrl?: string | null) => {
      setJsonText(text);
      setSavedFriendId(null);
      setImportWasUpdate(false);
      try {
        const nextPayload = parseTradeProfilePayload(text);
        const resolvedShareId = shareIdFromUrl?.trim() || nextPayload.shareId;
        if (resolvedShareId) nextPayload.shareId = resolvedShareId;
        setPayload(nextPayload);
        setMessage(
          friends.find(
            (item) =>
              (nextPayload.shareId && item.shareId === nextPayload.shareId) ||
              item.name.toLowerCase() === nextPayload.name.toLowerCase()
          )
            ? t("friendQr.existing")
            : null
        );
        return nextPayload;
      } catch {
        setPayload(null);
        setMessage(t("friendQr.invalid"));
        return null;
      }
    },
    [friends, t]
  );

  useEffect(() => {
    if (urlParsedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (!data) return;
    urlParsedRef.current = true;
    const shareId = params.get("share");
    const parsed = applyTradeInput(data, shareId);
    if (parsed) {
      window.history.replaceState(null, "", "/friend-qr");
    }
  }, [applyTradeInput]);

  function parseJson(text = jsonText) {
    return applyTradeInput(text);
  }

  function importFriend() {
    const nextPayload = payload ?? parseJson();
    if (!nextPayload || importing) return;

    setImporting(true);
    setMessage(null);

    void (async () => {
      try {
        const result = await importSavedFriend({
          ...friendFromTradeProfile(nextPayload, nextPayload.shareId),
          notes: t("friendQr.notes")
        });

        if (!result.ok || !result.friend) {
          setSavedFriendId(null);
          setImportWasUpdate(false);
          setMessage(t("friendQr.importFailed"));
          return;
        }

        setSavedFriendId(result.friend.id);
        setImportWasUpdate(result.wasUpdate);
        setMessage(result.wasUpdate ? t("friendQr.updated") : t("friendQr.saved"));
      } finally {
        setImporting(false);
      }
    })();
  }

  async function handleQrImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProcessingImage(true);
    setMessage(null);
    try {
      const text = await readQrFromImageFile(file);
      applyTradeInput(text);
    } catch (error) {
      setPayload(null);
      setMessage(error instanceof QrImageNotFoundError ? t("friendQr.imageInvalid") : t("friendQr.imageInvalid"));
    } finally {
      setProcessingImage(false);
    }
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard?.readText) {
      setMessage(t("friendQr.pasteFailed"));
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setMessage(t("friendQr.pasteEmpty"));
        return;
      }
      applyTradeInput(text);
    } catch {
      setMessage(t("friendQr.pasteFailed"));
    }
  }

  function closeScanner() {
    releaseScannerStream(scannerStream);
    setScannerStream(null);
    setScannerOpen(false);
  }

  async function openScanner() {
    if (scannerBooting || scannerOpen) return;

    setScannerBooting(true);
    setMessage(null);

    try {
      const stream = await requestQrCameraStream();
      setScannerStream(stream);
      setScannerOpen(true);
    } catch (error) {
      releaseScannerStream(null);
      setMessage(t(cameraErrorMessageKey(error)));
      if (!(error instanceof QrCameraError)) {
        console.warn("[friend qr] camera start failed", error);
      }
    } finally {
      setScannerBooting(false);
    }
  }

  function handleScan(data: string) {
    closeScanner();
    applyTradeInput(data);
  }

  async function copyWhatsApp() {
    if (!displayFriend || !match) return;
    const text = `${t("trades.possible")}: ${displayFriend.name}\n${t("trades.iCanGive")}: ${match.iCanGive.join(", ") || "-"}\n${t("trades.friendCanGive")}: ${match.friendCanGive.join(", ") || "-"}`;
    await navigator.clipboard?.writeText(text);
    setMessage(t("common.copied"));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("friendQr.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("friendQr.subtitle")}
        </p>
      </Card>

      <Card>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button tone="primary" disabled={scannerBooting} onClick={() => void openScanner()}>
            <Camera size={18} />
            {scannerBooting ? t("friendQr.cameraStarting") : t("friendQr.scanCamera")}
          </Button>
          <Button onClick={() => uploadRef.current?.click()} disabled={processingImage}>
            <ImageUp size={18} />
            {processingImage ? t("friendQr.processingImage") : t("friendQr.uploadImage")}
          </Button>
          <Button onClick={pasteFromClipboard}>
            <ClipboardPaste size={18} />
            {t("friendQr.pasteLinkButton")}
          </Button>
        </div>
        <input
          ref={uploadRef}
          className="hidden"
          type="file"
          accept={galleryAccept}
          onChange={handleQrImage}
          aria-label={t("friendQr.uploadImageLong")}
        />
        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          className="mt-4 min-h-28 w-full rounded-lg border-line bg-field font-mono text-xs text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white sm:min-h-32"
          placeholder={t("friendQr.pastePlaceholder")}
          aria-label={t("friendQr.pastePlaceholder")}
        />
        <Button className="mt-2 w-full sm:w-auto" onClick={() => parseJson()}>
          <QrCode size={18} />
          {t("friendQr.importFriend")}
        </Button>

        {payload ? (
          <div className="mt-4 animate-fade-in rounded-lg bg-field p-3 dark:bg-neutral-950">
            <p className="font-black text-ink dark:text-white">{payload.name}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {t("tradeQr.missingCount", { count: payload.missing.length })} · {t("tradeQr.duplicateCount", { count: payload.duplicates.length })}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {savedFriend ? (
                <>
                  <StatusMessage>{importWasUpdate ? t("friendQr.updated") : t("friendQr.saved")}</StatusMessage>
                  <Link
                    href={`/friends/${encodeURIComponent(savedFriend.id)}`}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-pitch px-4 text-sm font-black text-white sm:w-auto"
                  >
                    {t("friendQr.openComparison")}
                  </Link>
                  <Link
                    href="/trades"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line px-4 text-sm font-black text-ink dark:border-white/10 dark:text-white sm:w-auto"
                  >
                    {t("friendQr.backToTrades")}
                  </Link>
                </>
              ) : (
                <Button tone="primary" className="w-full sm:w-auto" disabled={importing} onClick={() => importFriend()}>
                  <Save size={18} />
                  {importing ? t("friendQr.importing") : existingFriend ? t("friendQr.updateExisting") : t("friendQr.createNew")}
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {message && !savedFriend ? <StatusMessage className="mt-4">{message}</StatusMessage> : null}
      </Card>

      {displayFriend && match ? (
        <Card>
          <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.possible")}</h2>
          {match.iCanGive.length === 0 && match.friendCanGive.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={QrCode}
                title={t("trades.noMatch")}
                body={t("trades.noMatchBody")}
                actionLabel={t("trades.noMatchAction")}
                actionHref="/trades"
              />
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MatchList title={t("trades.iCanGive")} codes={match.iCanGive} countText={t("trades.friendGetsCount", { count: match.iCanGive.length })} />
                <MatchList title={t("trades.friendCanGive")} codes={match.friendCanGive} countText={t("trades.iGetCount", { count: match.friendCanGive.length })} />
              </div>
              <Button className="mt-4" onClick={copyWhatsApp}>
                <Copy size={18} />
                {t("trades.copyWhatsApp")}
              </Button>
              <Link
                href={`/friends/${encodeURIComponent(displayFriend.id)}`}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-pitch px-4 text-sm font-black text-white"
              >
                {t("friendQr.openComparison")}
              </Link>
            </>
          )}
        </Card>
      ) : null}

      <FriendQrScanner open={scannerOpen} stream={scannerStream} onClose={closeScanner} onScan={handleScan} />
    </div>
  );
}

function MatchList({ title, codes, countText }: { title: string; codes: string[]; countText: string }) {
  return (
    <div className="rounded-lg border border-line p-3 dark:border-white/10">
      <h3 className="font-black text-ink dark:text-white">{title}</h3>
      <p className="mt-1 text-sm font-bold text-pitch">{countText}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {codes.length > 0 ? (
          codes.map((code) => (
            <span key={code} className="rounded-md bg-field px-2 py-1 text-xs font-black dark:bg-neutral-950">
              {code}
            </span>
          ))
        ) : null}
      </div>
    </div>
  );
}
