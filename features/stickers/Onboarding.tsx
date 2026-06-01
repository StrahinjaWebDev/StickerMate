"use client";

import { useState } from "react";
import { ArrowRight, ClipboardList, Keyboard, Zap } from "lucide-react";
import { formatPercent, getStats, stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { ImportSummary } from "@/types/sticker";

export function Onboarding() {
  const [mode, setMode] = useState<"welcome" | "import">("welcome");
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const quickImport = useCollectionStore((state) => state.quickImport);
  const quantities = useCollectionStore((state) => state.quantities);
  const setOnboarded = useCollectionStore((state) => state.setOnboarded);

  const stats = getStats(quantities, stickers);

  if (mode === "import") {
    return (
      <section className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Zap size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-ink dark:text-white">Quick Import</h1>
            <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              Paste sticker codes separated by spaces, commas, tabs, or new lines.
            </p>
          </div>
        </div>

        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="mt-5 min-h-56 w-full rounded-lg border-line bg-field text-base font-semibold uppercase text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
          placeholder={"BRA1\nBRA2\nARG10\nPOR15"}
          aria-label="Sticker codes"
        />

        {summary ? (
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <SummaryItem label="Imported" value={summary.imported} />
            <SummaryItem label="Duplicates" value={summary.duplicates} />
            <SummaryItem label="Invalid" value={summary.invalid} />
            <SummaryItem label="Progress" value={formatPercent(stats.completion)} />
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-pitch px-5 font-black text-white shadow-sm disabled:opacity-50"
            disabled={!input.trim()}
            onClick={() => setSummary(quickImport(input))}
          >
            Import Codes
            <ArrowRight size={19} />
          </button>
          <button
            type="button"
            className="min-h-12 rounded-lg border border-line px-5 font-black text-ink dark:border-white/10 dark:text-white"
            onClick={() => setOnboarded(true)}
          >
            Continue to Dashboard
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-5xl items-center gap-6 py-8 lg:grid-cols-[1fr_0.8fr] lg:py-14">
      <div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-black text-pitch shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <ClipboardList size={18} />
          1034 stickers, zero spreadsheet energy
        </div>
        <h1 className="mt-5 text-5xl font-black tracking-normal text-ink dark:text-white sm:text-6xl">
          StickerMate
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
          Track your FIFA World Cup 2026 collection. Keep owned stickers, missing stickers and duplicates tidy in
          seconds.
        </p>
        <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
          <button
            type="button"
            className="flex min-h-14 items-center justify-center gap-2 rounded-lg bg-pitch px-4 font-black text-white shadow-lift"
            onClick={() => setMode("import")}
          >
            <Zap size={20} />
            Quick Import
          </button>
          <button
            type="button"
            className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 font-black text-ink shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            onClick={() => setOnboarded(true)}
          >
            <Keyboard size={20} />
            Manual Setup
          </button>
          <button
            type="button"
            className="min-h-14 rounded-lg border border-line px-4 font-black text-neutral-700 dark:border-white/10 dark:text-neutral-300"
            onClick={() => setOnboarded(true)}
          >
            Skip For Now
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900">
        <div className="rounded-lg bg-field p-4 dark:bg-neutral-950">
          <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">Fast entry preview</p>
          <div className="mt-4 space-y-2 font-mono text-sm font-bold">
            {["BRA1", "BRA2", "BRA3", "ARG1", "POR15"].map((code) => (
              <div key={code} className="flex items-center justify-between rounded-md bg-white px-3 py-3 dark:bg-neutral-900">
                <span>{code}</span>
                <span className="rounded-md bg-pitch px-2 py-1 text-xs text-white">owned</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
      <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-black text-ink dark:text-white">{value}</p>
    </div>
  );
}
