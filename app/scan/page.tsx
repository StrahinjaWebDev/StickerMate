"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Camera, ImageUp, Plus, Save, Wallet, X } from "lucide-react";
import { Button, Card } from "@/components/ui/Primitives";
import { GuideCard } from "@/components/GuideCard";
import { ImportPreview } from "@/features/stickers/ImportPreview";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/lib/i18n";
import { spendingCurrencies } from "@/lib/spending";
import { getAnySticker, getSticker } from "@/lib/stickers";
import { codesToText, extractStickerCodeCandidates, validateStickerCodes } from "@/services/stickerCodeService";
import { recognizeStickerCodesFromImage } from "@/services/stickerRecognitionService";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { ImportSummary, RecognitionResult, SpendingCategory, SpendingCurrency } from "@/types/sticker";

const spendingCategories: SpendingCategory[] = ["packs", "album", "bundle", "individual", "other"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ScanPage() {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const addConfirmedCodes = useCollectionStore((state) => state.addConfirmedCodes);
  const defaultCurrency = useCollectionStore((state) => state.defaultCurrency);
  const { t } = useI18n();
  const [codesText, setCodesText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [spendingAmount, setSpendingAmount] = useState("");
  const [spendingCurrency, setSpendingCurrency] = useState<SpendingCurrency>(defaultCurrency);
  const [spendingCategory, setSpendingCategory] = useState<SpendingCategory>("packs");
  const [spendingPacks, setSpendingPacks] = useState("");
  const [spendingNote, setSpendingNote] = useState("");

  const validation = useMemo(
    () => validateStickerCodes(extractStickerCodeCandidates(codesText)),
    [codesText]
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setMessage(null);
    setSummary(null);
    setLoading(true);

    const result = await recognizeStickerCodesFromImage(file);
    setRecognition(result);
    setCodesText(codesToText([...result.detectedCodes, ...result.excludedCodes, ...result.invalidCodes]));
    setLoading(false);
  }

  function saveEntry() {
    if (validation.validCodes.length === 0) {
      setMessage(t("scan.noValidCodes"));
      return;
    }

    const amount = spendingAmount.trim() ? Number(spendingAmount) : 0;
    if (spendingAmount.trim() && (!Number.isFinite(amount) || amount <= 0)) {
      setMessage(t("spending.amountError"));
      return;
    }

    const result = addConfirmedCodes(
      validation.validCodes,
      t("scan.note"),
      amount > 0
        ? {
            amount,
            currency: spendingCurrency,
            category: spendingCategory,
            date: today(),
            packsCount: spendingPacks ? Number(spendingPacks) : undefined,
            stickersCount: validation.validCodes.length,
            note: spendingNote || t("scan.note")
          }
        : undefined
    );
    setSummary(result);
    setMessage(t("scan.saved"));
    setSpendingAmount("");
    setSpendingPacks("");
    setSpendingNote("");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("scan.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("scan.subtitle")}
        </p>
        <p className="mt-3 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
          {t("scan.ocrReady")}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button tone="primary" onClick={() => cameraRef.current?.click()}>
            <Camera size={19} />
            {t("scan.openCamera")}
          </Button>
          <Button onClick={() => uploadRef.current?.click()}>
            <ImageUp size={19} />
            {t("scan.uploadImage")}
          </Button>
          <Button onClick={() => setCodesText((current) => current || t("scan.placeholder"))}>
            <Plus size={19} />
            {t("scan.manualEntry")}
          </Button>
        </div>
        <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
        <input ref={uploadRef} className="hidden" type="file" accept="image/*" onChange={handleFileChange} />
      </Card>

      <GuideCard guide="scan" titleKey="guide.scanTitle" bodyKey="guide.scanBody" />

      {previewUrl ? (
        <Card>
          <img src={previewUrl} alt={t("scan.uploadImage")} className="max-h-[420px] w-full rounded-lg object-contain" />
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-ink dark:text-white">{t("scan.confirmCodes")}</h2>
          <Button tone="primary" onClick={saveEntry} disabled={loading}>
            <Save size={19} />
            {t("scan.saveEntry")}
          </Button>
        </div>
        <textarea
          value={codesText}
          onChange={(event) => setCodesText(event.target.value)}
          className="mt-4 min-h-40 w-full rounded-lg border-line bg-field font-mono text-sm font-bold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          placeholder={t("scan.placeholder")}
          aria-label={t("scan.confirmCodes")}
        />

        <details className="mt-4 rounded-lg border border-line bg-field p-3 dark:border-white/10 dark:bg-neutral-950">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-black text-ink dark:text-white">
            <Wallet size={17} />
            {t("scan.entrySpending")}
          </summary>
          <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
            {t("scan.entrySpendingBody")}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-sm font-black text-ink dark:text-white">{t("spending.amount")}</span>
              <input
                value={spendingAmount}
                onChange={(event) => setSpendingAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border-line bg-white font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
                inputMode="decimal"
                min="0"
                step="0.01"
                type="number"
              />
            </label>
            <label>
              <span className="text-sm font-black text-ink dark:text-white">{t("spending.currency")}</span>
              <select
                value={spendingCurrency}
                onChange={(event) => setSpendingCurrency(event.target.value as SpendingCurrency)}
                className="mt-1 w-full rounded-lg border-line bg-white font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              >
                {spendingCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-black text-ink dark:text-white">{t("spending.category")}</span>
              <select
                value={spendingCategory}
                onChange={(event) => setSpendingCategory(event.target.value as SpendingCategory)}
                className="mt-1 w-full rounded-lg border-line bg-white font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              >
                {spendingCategories.map((category) => (
                  <option key={category} value={category}>
                    {t(`spending.category.${category}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-black text-ink dark:text-white">{t("spending.packsOptional")}</span>
              <input
                value={spendingPacks}
                onChange={(event) => setSpendingPacks(event.target.value)}
                className="mt-1 w-full rounded-lg border-line bg-white font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
                inputMode="numeric"
                min="0"
                type="number"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-black text-ink dark:text-white">{t("spending.note")}</span>
              <textarea
                value={spendingNote}
                onChange={(event) => setSpendingNote(event.target.value)}
                className="mt-1 min-h-20 w-full rounded-lg border-line bg-white font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              />
            </label>
          </div>
        </details>

        {loading ? <p className="mt-3 text-sm font-bold text-pitch">{t("scan.ocrRunning")}</p> : null}
        {message ? <p className="mt-3 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{message}</p> : null}
        {recognition?.warnings?.map((warning) => (
          <p key={warning} className="mt-3 rounded-lg bg-gold/15 p-3 text-sm font-bold text-yellow-800 dark:text-gold">
            {t(warning as TranslationKey)}
          </p>
        ))}

        <CodeGroup title={t("scan.detected")} codes={validation.validCodes} />
        <CodeGroup title={t("scan.excluded")} codes={validation.excludedCodes} excluded />
        <CodeGroup title={t("scan.notRecognized")} codes={validation.invalidCodes} invalid />

        {recognition?.rawText ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-black text-ink dark:text-white">{t("scan.rawText")}</summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-field p-3 text-xs text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
              {recognition.rawText}
            </pre>
          </details>
        ) : null}

        {summary ? <ImportPreview summary={summary} /> : null}
      </Card>
    </div>
  );
}

function CodeGroup({ title, codes, invalid = false, excluded = false }: { title: string; codes: string[]; invalid?: boolean; excluded?: boolean }) {
  if (codes.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-black text-ink dark:text-white">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {codes.map((code) => {
          const sticker = invalid ? undefined : excluded ? getAnySticker(code) : getSticker(code);
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1 text-xs font-black text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
            >
              {invalid ? <X size={13} /> : null}
              {code}
              {sticker ? ` - ${sticker.name}` : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
