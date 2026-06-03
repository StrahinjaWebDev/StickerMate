"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCcw, Share2 } from "lucide-react";
import { Button, Card } from "@/components/ui/Primitives";
import { StatusMessage } from "@/components/StatusMessage";
import { GuideCard } from "@/components/GuideCard";
import { getProfileInfo } from "@/lib/accountProfile";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import { getGuestIdentity, type GuestIdentity } from "@/lib/guestProfiles";
import { useI18n } from "@/hooks/useI18n";
import { getClientPublicOrigin } from "@/lib/seo";
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
  const displayName = useMemo(() => {
    if (user) {
      const profile = getProfileInfo(user);
      return profile.displayName || t("tradeQr.userFallback");
    }
    return guestIdentity?.name || t("tradeQr.userFallback");
  }, [guestIdentity, t, user]);
  const payload = useMemo(
    () => ({ ...buildTradeProfilePayload(displayName, quantities), generatedAt }),
    [displayName, generatedAt, quantities]
  );
  useEffect(() => {
    setGuestIdentity(getGuestIdentity());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function renderQr() {
      const QRCode = (await import("qrcode")).default;
      const compactPayload = await encodeTradeProfileForQr(payload);
      const link = buildTradeQrLink(compactPayload, getClientPublicOrigin());
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
  }, [payload]);

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

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("tradeQr.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">{t("tradeQr.privacy")}</p>
      </Card>

      <GuideCard guide="tradeQr" titleKey="guide.tradeQrTitle" bodyKey="guide.tradeQrBody" />

      <Card>
        <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
          <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("tradeQr.sharedAs")}</p>
          <p className="mt-1 break-words text-base font-black text-ink dark:text-white">{displayName}</p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[300px_1fr] sm:items-start">
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label={t("tradeQr.missingCount", { count: payload.missing.length })} />
              <Stat label={t("tradeQr.duplicateCount", { count: payload.duplicates.length })} />
            </div>
            <Button className="w-full" onClick={copyQrLink} disabled={!qrLink}>
              <Copy size={18} />
              {t("tradeQr.copyQrLink")}
            </Button>
            <Button className="w-full" onClick={share} disabled={!qrLink}>
              <Share2 size={18} />
              {t("tradeQr.share")}
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
    <div className="rounded-lg border border-line p-3 text-sm font-black text-ink dark:border-white/10 dark:text-white">
      {label}
    </div>
  );
}
