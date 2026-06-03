"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCcw, Share2 } from "lucide-react";
import { Button, Card } from "@/components/ui/Primitives";
import { GuideCard } from "@/components/GuideCard";
import { getProfileInfo } from "@/lib/accountProfile";
import { useAuthSyncStore } from "@/lib/authSyncStore";
import { getGuestIdentity, type GuestIdentity } from "@/lib/guestProfiles";
import { useI18n } from "@/hooks/useI18n";
import { buildTradeProfilePayload, encodeTradeProfileForQr } from "@/services/tradeQrService";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function TradeQrPage() {
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const user = useAuthSyncStore((state) => state.user);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);
  const [qrUrl, setQrUrl] = useState("");
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
  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  useEffect(() => {
    setGuestIdentity(getGuestIdentity());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function renderQr() {
      const QRCode = await import("qrcode");
      const compactPayload = await encodeTradeProfileForQr(payload);
      const dataUrl = await QRCode.toDataURL(compactPayload, { errorCorrectionLevel: "M", margin: 1, width: 280 });
      if (!cancelled) setQrUrl(dataUrl);
    }
    renderQr().catch(() => setQrUrl(""));
    return () => {
      cancelled = true;
    };
  }, [payload]);

  async function copyJson() {
    await navigator.clipboard?.writeText(payloadJson);
    setMessage(t("common.copied"));
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: t("tradeQr.title"), text: payloadJson }).catch(() => undefined);
    } else {
      await copyJson();
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
            {qrUrl ? <img src={qrUrl} alt={t("tradeQr.title")} className="mx-auto h-64 w-64 rounded bg-white p-2" /> : null}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label={t("tradeQr.missingCount", { count: payload.missing.length })} />
              <Stat label={t("tradeQr.duplicateCount", { count: payload.duplicates.length })} />
            </div>
            <Button className="w-full" onClick={copyJson}>
              <Copy size={18} />
              {t("tradeQr.copyJson")}
            </Button>
            <Button className="w-full" onClick={share}>
              <Share2 size={18} />
              {t("tradeQr.share")}
            </Button>
            <Button className="w-full" onClick={() => setGeneratedAt(new Date().toISOString())}>
              <RefreshCcw size={18} />
              {t("tradeQr.regenerate")}
            </Button>
            {message ? <p className="rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{message}</p> : null}
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
