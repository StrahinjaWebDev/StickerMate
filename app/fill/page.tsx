"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Keyboard, Layers3, Save, Sticker, Wallet } from "lucide-react";
import { Button, Card } from "@/components/ui/Primitives";
import { ImportPreview } from "@/features/stickers/ImportPreview";
import { useI18n } from "@/hooks/useI18n";
import { calculatePackSpending, calculatePackStickers, formatMoney } from "@/lib/spending";
import { extractStickerCodeCandidates, validateStickerCodes } from "@/services/stickerCodeService";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { ImportSummary } from "@/types/sticker";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function FillPage() {
  const { language, t } = useI18n();
  const addConfirmedCodes = useCollectionStore((state) => state.addConfirmedCodes);
  const packPriceRsd = useCollectionStore((state) => state.packPriceRsd);
  const stickersPerPack = useCollectionStore((state) => state.stickersPerPack);
  const [codesText, setCodesText] = useState("");
  const [packsText, setPacksText] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const validation = useMemo(
    () => validateStickerCodes(extractStickerCodeCandidates(codesText)),
    [codesText]
  );
  const packsCount = Math.max(0, Math.floor(Number(packsText) || 0));
  const packAmount = calculatePackSpending(packsCount, packPriceRsd);
  const packStickers = calculatePackStickers(packsCount, stickersPerPack);

  function saveEntry() {
    if (validation.validCodes.length === 0) {
      setMessage(t("entry.noValidCodes"));
      return;
    }

    const result = addConfirmedCodes(
      validation.validCodes,
      note || t("entry.note"),
      packsCount > 0
        ? {
            date: today(),
            amount: packAmount,
            currency: "RSD",
            category: "packs",
            packsCount,
            stickersCount: packStickers,
            note: note || t("entry.note")
          }
        : undefined
    );

    setSummary(result);
    setMessage(t("entry.saved"));
    setPacksText("");
    setNote("");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card className="shadow-lift sm:p-5">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("fill.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">{t("fill.body")}</p>
      </Card>

      <section className="grid gap-2 sm:grid-cols-3">
        <FillChoice
          href="/review"
          icon={<Layers3 size={22} />}
          title={t("fill.quickTitle")}
          body={t("fill.quickBody")}
          primary
        />
        <a href="#new-entry" className="flex min-h-20 items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-sm transition active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Sticker size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-ink dark:text-white">{t("fill.newEntryTitle")}</span>
            <span className="mt-1 block text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">{t("fill.newEntryBody")}</span>
          </span>
          <ArrowRight className="shrink-0 text-pitch" size={18} />
        </a>
        <FillChoice
          href="/collection"
          icon={<Keyboard size={22} />}
          title={t("fill.manualTitle")}
          body={t("fill.manualBody")}
        />
      </section>

      <Card className="scroll-mt-24" id="new-entry">
        <div>
          <div>
            <h2 className="text-xl font-black text-ink dark:text-white">{t("entry.title")}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
              {t("entry.body")}
            </p>
          </div>
        </div>

        <textarea
          value={codesText}
          onChange={(event) => setCodesText(event.target.value)}
          className="mt-4 min-h-40 w-full rounded-lg border-line bg-field font-mono text-sm font-bold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          placeholder={t("entry.placeholder")}
          aria-label={t("entry.codesLabel")}
        />

        <details className="mt-4 rounded-lg border border-line bg-field p-3 dark:border-white/10 dark:bg-neutral-950">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-black text-ink dark:text-white">
            <Wallet size={17} />
            {t("entry.packSpending")}
          </summary>
          <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
            {t("entry.packSpendingBody", {
              stickers: stickersPerPack,
              price: formatMoney(packPriceRsd, language)
            })}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-sm font-black text-ink dark:text-white">{t("spending.packsOptional")}</span>
              <input
                value={packsText}
                onChange={(event) => setPacksText(event.target.value)}
                className="mt-1 w-full rounded-lg border-line bg-white font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
                inputMode="numeric"
                min="0"
                type="number"
              />
            </label>
            <div className="rounded-lg bg-white p-3 dark:bg-neutral-900">
              <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("spending.autoCalculation")}</p>
              <p className="mt-1 text-lg font-black text-ink dark:text-white">
                {packsCount > 0 ? formatMoney(packAmount, language) : "-"}
              </p>
              <p className="mt-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                {packsCount > 0 ? t("spending.stickersValue", { count: packStickers }) : t("spending.packFormula", { stickers: stickersPerPack, price: formatMoney(packPriceRsd, language) })}
              </p>
            </div>
            <label className="sm:col-span-2">
              <span className="text-sm font-black text-ink dark:text-white">{t("spending.note")}</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-1 min-h-20 w-full rounded-lg border-line bg-white font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              />
            </label>
          </div>
        </details>

        {message ? <p className="mt-3 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{message}</p> : null}
        {validation.validCodes.length > 0 ? (
          <p className="mt-3 text-sm font-bold text-pitch">{t("entry.validCount", { count: validation.validCodes.length })}</p>
        ) : null}
        <Button className="mt-4 w-full" tone="primary" onClick={saveEntry}>
          <Save size={19} />
          {t("entry.save")}
        </Button>
        {summary ? <ImportPreview summary={summary} /> : null}
      </Card>
    </div>
  );
}

function FillChoice({
  href,
  icon,
  title,
  body,
  primary = false
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "flex min-h-20 items-center gap-3 rounded-lg bg-pitch p-3 text-white shadow-lift transition active:scale-[0.98]"
          : "flex min-h-20 items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-sm transition active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900"
      }
    >
      <span className={primary ? "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/15" : "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white"}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={primary ? "block font-black" : "block font-black text-ink dark:text-white"}>{title}</span>
        <span className={primary ? "mt-1 block text-sm font-semibold leading-5 text-white/85" : "mt-1 block text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400"}>{body}</span>
      </span>
      <ArrowRight className={primary ? "shrink-0 text-white" : "shrink-0 text-pitch"} size={18} />
    </Link>
  );
}
