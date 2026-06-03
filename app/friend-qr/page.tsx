"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Copy, ImageUp, QrCode, Save } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button, Card } from "@/components/ui/Primitives";
import { GuideCard } from "@/components/GuideCard";
import { useI18n } from "@/hooks/useI18n";
import { getTradeMatch, parseTradeProfilePayload } from "@/services/tradeQrService";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TradeFriend, TradeProfilePayload } from "@/types/sticker";

export default function FriendQrPage() {
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const { t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const friends = useCollectionStore((state) => state.friends);
  const upsertFriend = useCollectionStore((state) => state.upsertFriend);
  const [jsonText, setJsonText] = useState("");
  const [payload, setPayload] = useState<TradeProfilePayload | null>(null);
  const [friend, setFriend] = useState<TradeFriend | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const existingFriend = payload
    ? friends.find((item) => item.name.toLowerCase() === payload.name.toLowerCase())
    : undefined;
  const match = useMemo(() => (friend ? getTradeMatch(quantities, friend) : null), [friend, quantities]);

  useEffect(() => {
    const data = new URLSearchParams(window.location.search).get("data");
    if (!data) return;
    setJsonText(data);
    try {
      const nextPayload = parseTradeProfilePayload(data);
      setPayload(nextPayload);
      setMessage(
        friends.find((item) => item.name.toLowerCase() === nextPayload.name.toLowerCase())
          ? t("friendQr.existing")
          : null
      );
    } catch {
      setPayload(null);
      setMessage(t("friendQr.invalid"));
    }
  }, [friends, t]);

  function parseJson(text = jsonText) {
    try {
      const nextPayload = parseTradeProfilePayload(text);
      setPayload(nextPayload);
      setMessage(existingFriend ? t("friendQr.existing") : null);
      return nextPayload;
    } catch {
      setPayload(null);
      setMessage(t("friendQr.invalid"));
      return null;
    }
  }

  function importFriend(mode: "update" | "create") {
    const nextPayload = payload ?? parseJson();
    if (!nextPayload) return;

    const nextFriend = upsertFriend(
      {
        name: nextPayload.name,
        missing: nextPayload.missing,
        duplicates: nextPayload.duplicates,
        notes: t("friendQr.notes")
      },
      mode
    );
    setFriend(nextFriend);
    setMessage(t("friendQr.imported"));
  }

  async function handleQrImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await readQrFromImage(file);
      setJsonText(text);
      parseJson(text);
    } catch {
      setMessage(t("friendQr.invalid"));
    }
  }

  async function copyWhatsApp() {
    if (!friend || !match) return;
    const text = `${t("trades.possible")}: ${friend.name}\n${t("trades.iCanGive")}: ${match.iCanGive.join(", ") || "-"}\n${t("trades.friendCanGive")}: ${match.friendCanGive.join(", ") || "-"}`;
    await navigator.clipboard?.writeText(text);
    setMessage(t("common.copied"));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("friendQr.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("friendQr.subtitle")}
        </p>
      </Card>

      <GuideCard guide="friendQr" titleKey="guide.friendQrTitle" bodyKey="guide.friendQrBody" />

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => uploadRef.current?.click()}>
            <ImageUp size={18} />
            {t("friendQr.uploadQr")}
          </Button>
          <Button tone="primary" onClick={() => parseJson()}>
            <QrCode size={18} />
            {t("friendQr.importFriend")}
          </Button>
        </div>
        <input ref={uploadRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={handleQrImage} />
        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          className="mt-4 min-h-48 w-full rounded-lg border-line bg-field font-mono text-xs text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          placeholder={t("friendQr.pasteJson")}
          aria-label={t("friendQr.pasteJson")}
        />

        {payload ? (
          <div className="mt-4 rounded-lg bg-field p-3 dark:bg-neutral-950">
            <p className="font-black text-ink dark:text-white">{payload.name}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {t("tradeQr.missingCount", { count: payload.missing.length })} · {t("tradeQr.duplicateCount", { count: payload.duplicates.length })}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button tone="primary" onClick={() => importFriend(existingFriend ? "update" : "create")}>
                <Save size={18} />
                {existingFriend ? t("friendQr.updateExisting") : t("friendQr.createNew")}
              </Button>
              {existingFriend ? (
                <Button onClick={() => importFriend("create")}>{t("friendQr.createNew")}</Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {message ? <p className="mt-4 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{message}</p> : null}
      </Card>

      {friend && match ? (
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
            </>
          )}
        </Card>
      ) : null}
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

async function readQrFromImage(file: File) {
  const jsQR = (await import("jsqr")).default;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(bitmap, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(image.data, image.width, image.height);
  if (!code?.data) throw new Error("QR not found");
  return code.data;
}
