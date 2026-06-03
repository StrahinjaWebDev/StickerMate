"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Keyboard, Layers3, Save, Sticker, X } from "lucide-react";
import { Button, Card } from "@/components/ui/Primitives";
import { StatusMessage } from "@/components/StatusMessage";
import { ImportPreview } from "@/features/stickers/ImportPreview";
import { useI18n } from "@/hooks/useI18n";
import { extractStickerCodeCandidates, validateStickerCodes } from "@/services/stickerCodeService";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { ImportSummary } from "@/types/sticker";

export default function FillPage() {
  const { t } = useI18n();
  const addConfirmedCodes = useCollectionStore((state) => state.addConfirmedCodes);
  const [codesText, setCodesText] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);

  const validation = useMemo(
    () => validateStickerCodes(extractStickerCodeCandidates(codesText)),
    [codesText]
  );

  function saveEntry() {
    if (validation.validCodes.length === 0) {
      setMessage(t("entry.noValidCodes"));
      return;
    }

    const result = addConfirmedCodes(validation.validCodes, note || t("entry.note"));
    setSummary(result);
    setMessage(t("entry.saved"));
    setCodesText("");
    setNote("");
    setEntryOpen(false);
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
        <button
          type="button"
          onClick={() => setEntryOpen(true)}
          aria-controls="new-entry"
          aria-expanded={entryOpen}
          className="flex min-h-20 items-center gap-3 rounded-lg border border-line bg-white p-3 text-left shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Sticker size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-ink dark:text-white">{t("fill.newEntryTitle")}</span>
            <span className="mt-1 block text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">{t("fill.newEntryBody")}</span>
          </span>
          <ArrowRight className="shrink-0 text-pitch" size={18} />
        </button>
        <FillChoice
          href="/collection"
          icon={<Keyboard size={22} />}
          title={t("fill.manualTitle")}
          body={t("fill.manualBody")}
        />
      </section>

      {entryOpen ? (
        <Card className="scroll-mt-24" id="new-entry">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-ink dark:text-white">{t("entry.title")}</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
                {t("entry.body")}
              </p>
            </div>
            <Button
              className="min-h-10 px-3 text-sm"
              onClick={() => {
                setEntryOpen(false);
                setMessage(null);
              }}
            >
              <X size={17} />
              {t("common.cancel")}
            </Button>
          </div>
        </div>

        <textarea
          value={codesText}
          onChange={(event) => setCodesText(event.target.value)}
          className="mt-4 min-h-40 w-full rounded-lg border-line bg-field font-mono text-sm font-bold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          placeholder={t("entry.placeholder")}
          aria-label={t("entry.codesLabel")}
        />

        <label className="mt-4 block">
          <span className="text-sm font-black text-ink dark:text-white">{t("spending.note")}</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 min-h-20 w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          />
        </label>

        {validation.validCodes.length > 0 ? (
          <p className="mt-3 text-sm font-bold text-pitch">{t("entry.validCount", { count: validation.validCodes.length })}</p>
        ) : null}
        <Button className="mt-4 w-full" tone="primary" onClick={saveEntry}>
          <Save size={19} />
          {t("entry.save")}
        </Button>
        </Card>
      ) : null}
      {message ? <StatusMessage>{message}</StatusMessage> : null}
      {summary ? <ImportPreview summary={summary} /> : null}
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
