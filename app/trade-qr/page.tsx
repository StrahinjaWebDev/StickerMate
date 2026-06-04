"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { Copy, ImageDown, RefreshCcw, Share2 } from "lucide-react";
import { Button, Card } from "@/components/ui/Primitives";
import { StatusMessage } from "@/components/StatusMessage";
import { getProfileInfo } from "@/lib/accountProfile";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import { getGuestIdentity, type GuestIdentity } from "@/lib/guestProfiles";
import { getClientPublicOrigin } from "@/lib/seo";
import { shareImageBlob } from "@/lib/shareImageFile";
import { renderTradeShareCard } from "@/lib/tradeShareCard";
import { publishCurrentTradeShare } from "@/lib/tradeSharePublisher";
import { buildStableShareId } from "@/lib/tradeShareService";
import { useI18n } from "@/hooks/useI18n";
import { buildTradeProfilePayload, buildTradeQrLink, encodeTradeProfileForQr } from "@/services/tradeQrService";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function TradeQrPage() {
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const user = useAuthSyncStore((state) => state.user);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrLink, setQrLink] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState(() => new Date().toISOString());
  const [shareId, setShareId] = useState<string | null>(null);
  const [sharingCard, setSharingCard] = useState(false);

  const displayName = useMemo(() => {
    if (user) {
      const profile = getProfileInfo(user);
      return profile.displayName || t("tradeQr.userFallback");
    }
    return guestIdentity?.name || t("tradeQr.userFallback");
  }, [guestIdentity, t, user]);

  const payload = useMemo(
    () => ({ ...buildTradeProfilePayload(displayName, quantities), generatedAt, shareId: shareId ?? undefined }),
    [displayName, generatedAt, quantities, shareId]
  );

  useEffect(() => {
    setGuestIdentity(getGuestIdentity());
  }, []);

  const tradeListsKey = useMemo(
    () => `${payload.missing.join(",")}|${payload.duplicates.join(",")}`,
    [payload.missing, payload.duplicates]
  );

  useEffect(() => {
    if (!user) {
      setShareId(null);
      return;
    }

    setShareId(buildStableShareId(user.id));
    void publishCurrentTradeShare(true);
  }, [user, displayName, tradeListsKey, payload.missing, payload.duplicates]);

  useEffect(() => {
    let cancelled = false;
    async function renderQr() {
      const QRCode = (await import("qrcode")).default;
      const compactPayload = encodeTradeProfileForQr(payload);
      const link = buildTradeQrLink(compactPayload, getClientPublicOrigin(), shareId ?? undefined);
      const dataUrl = await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1, width: 280 });
      if (!cancelled) {
        setQrLink(link);
        setQrUrl(dataUrl);
      }
    }
    renderQr().catch(() => {
      setQrLink("");
      setQrUrl("");
    });
    return () => {
      cancelled = true;
    };
  }, [payload, shareId]);

  async function copyQrLink() {
    if (!qrLink) return;
    await navigator.clipboard?.writeText(qrLink);
    setMessage(t("common.copied"));
  }

  async function share() {
    if (navigator.share && qrLink) {
      await navigator.share({ title: t("tradeQr.title"), url: qrLink }).catch(() => undefined);
    } else {
      await copyQrLink();
    }
  }

  async function shareCard() {
    if (!qrUrl || sharingCard) return;

    setSharingCard(true);
    setMessage(null);

    try {
      const blob = await renderTradeShareCard({
        brand: t("tradeQr.shareCardBrand"),
        title: t("tradeQr.shareCardTitle"),
        displayName,
        missingLabel: t("tradeQr.shareCardMissing", { count: payload.missing.length }),
        duplicateLabel: t("tradeQr.shareCardDuplicates", { count: payload.duplicates.length }),
        qrDataUrl: qrUrl,
        cta: t("tradeQr.shareCardCta"),
        footer: t("tradeQr.shareCardFooter")
      });

      const result = await shareImageBlob(blob, "stickermate-trade-card.png", {
        title: t("tradeQr.shareCardTitle"),
        text: t("tradeQr.shareCardCta"),
        fallbackUrl: qrLink || undefined
      });

      if (result === "shared") {
        setMessage(t("tradeQr.shareCardShared"));
      } else if (result === "downloaded" || result === "link-shared") {
        setMessage(t("tradeQr.shareCardDownloaded"));
      } else {
        setMessage(t("tradeQr.shareCardFailed"));
        if (qrLink) await navigator.clipboard?.writeText(qrLink);
      }
    } catch {
      setMessage(t("tradeQr.shareCardFailed"));
      if (qrLink) await navigator.clipboard?.writeText(qrLink);
    } finally {
      setSharingCard(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="shadow-lift">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("tradeQr.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">{t("tradeQr.privacy")}</p>
      </Card>

      <Card>
        <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
          <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("tradeQr.sharedAs")}</p>
          <p className="mt-1 break-words text-base font-black text-ink dark:text-white">{displayName}</p>
        </div>

        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
            {qrUrl ? (
              <img src={qrUrl} alt={t("tradeQr.qrAlt", { name: displayName })} className="mx-auto h-56 w-56 rounded bg-white p-2 sm:h-64 sm:w-64" />
            ) : (
              <div className="mx-auto grid h-56 w-56 place-items-center rounded bg-white p-2 sm:h-64 sm:w-64">
                <div
                  className="h-48 w-48 animate-pulse-soft rounded bg-neutral-100 dark:bg-neutral-800/40 sm:h-56 sm:w-56"
                  aria-hidden="true"
                />
                <p className="sr-only">{t("tradeQr.generating")}</p>
              </div>
            )}
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-2">
            <Stat label={t("tradeQr.missingCount", { count: payload.missing.length })} />
            <Stat label={t("tradeQr.duplicateCount", { count: payload.duplicates.length })} />
          </div>
          <div className="grid w-full max-w-sm gap-2">
            <Button className="w-full" onClick={copyQrLink} disabled={!qrLink}>
              <Copy size={18} />
              {t("tradeQr.copyQrLink")}
            </Button>
            <Button className="w-full" onClick={share} disabled={!qrLink}>
              <Share2 size={18} />
              {t("tradeQr.share")}
            </Button>
            <Button className="w-full" tone="primary" onClick={shareCard} disabled={!qrUrl || sharingCard}>
              <ImageDown size={18} />
              {sharingCard ? t("tradeQr.shareCardGenerating") : t("tradeQr.shareCard")}
            </Button>
            <Button className="w-full" onClick={() => setGeneratedAt(new Date().toISOString())}>
              <RefreshCcw size={18} />
              {t("tradeQr.regenerate")}
            </Button>
            {message ? <StatusMessage>{message}</StatusMessage> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-line p-3 text-center text-sm font-black text-ink dark:border-white/10 dark:text-white">
      {label}
    </div>
  );
}
