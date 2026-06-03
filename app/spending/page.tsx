"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, Wallet, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { GuideCard } from "@/components/GuideCard";
import { Badge, Button, Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/lib/i18n";
import { calculatePackSpending, calculatePackStickers, getEntryAmountRsd, getSpendingStats, formatMoney, PACK_PRICE_RSD, STICKERS_PER_PACK } from "@/lib/spending";
import { getStats, stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { SpendingCategory, SpendingEntry } from "@/types/sticker";

const categories: SpendingCategory[] = ["packs", "album", "bundle", "individual", "other"];

function categoryKey(category: SpendingCategory) {
  return `spending.category.${category}` as TranslationKey;
}

type SpendingFormState = {
  amount: string;
  category: SpendingCategory;
  date: string;
  packsCount: string;
  stickersCount: string;
  note: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): SpendingFormState {
  return {
    amount: "",
    category: "packs",
    date: today(),
    packsCount: "",
    stickersCount: "",
    note: ""
  };
}

function formFromEntry(entry: SpendingEntry): SpendingFormState {
  return {
    amount: String(getEntryAmountRsd(entry)),
    category: entry.category,
    date: entry.date,
    packsCount: entry.packsCount ? String(entry.packsCount) : "",
    stickersCount: entry.stickersCount ? String(entry.stickersCount) : "",
    note: entry.note ?? ""
  };
}

export default function SpendingPage() {
  const { language, t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const spendingEntries = useCollectionStore((state) => state.spendingEntries);
  const addSpendingEntry = useCollectionStore((state) => state.addSpendingEntry);
  const updateSpendingEntry = useCollectionStore((state) => state.updateSpendingEntry);
  const deleteSpendingEntry = useCollectionStore((state) => state.deleteSpendingEntry);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SpendingFormState>(() => emptyForm());

  const collectionStats = useMemo(() => getStats(quantities, stickers), [quantities]);
  const spendingStats = useMemo(
    () => getSpendingStats(spendingEntries, collectionStats.owned),
    [collectionStats.owned, spendingEntries]
  );

  const sortedEntries = useMemo(
    () =>
      [...spendingEntries].sort((a, b) => {
        const dateSort = b.date.localeCompare(a.date);
        return dateSort || b.createdAt.localeCompare(a.createdAt);
      }),
    [spendingEntries]
  );

  function updateForm<K extends keyof SpendingFormState>(key: K, value: SpendingFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setError(null);
  }

  function startAdd() {
    resetForm();
    setFormOpen(true);
  }

  function startEdit(entry: SpendingEntry) {
    setForm(formFromEntry(entry));
    setEditingId(entry.id);
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const packsCount = form.packsCount ? Math.max(0, Math.floor(Number(form.packsCount))) : 0;
    const manualAmount = form.amount ? Number(form.amount) : 0;
    const amount = manualAmount > 0 ? manualAmount : form.category === "packs" ? calculatePackSpending(packsCount) : 0;
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("spending.amountError"));
      return;
    }

    if (!form.date) {
      setError(t("spending.dateError"));
      return;
    }

    const payload = {
      amount,
      currency: "RSD" as const,
      category: form.category,
      date: form.date,
      packsCount,
      stickersCount: form.stickersCount ? Number(form.stickersCount) : packsCount ? calculatePackStickers(packsCount) : undefined,
      note: form.note
    };

    if (editingId) updateSpendingEntry(editingId, payload);
    else addSpendingEntry(payload);

    resetForm();
    setFormOpen(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteSpendingEntry(deleteId);
    if (editingId === deleteId) resetForm();
    setDeleteId(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="shadow-lift">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-ink dark:text-white">{t("spending.title")}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
              {t("spending.body")}
            </p>
          </div>
          <Button tone="primary" onClick={startAdd}>
            <Plus size={19} />
            {t("spending.add")}
          </Button>
        </div>
        <p className="mt-4 rounded-lg bg-field p-3 text-sm font-bold leading-6 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
          {t("spending.tradeNote")}
        </p>
      </Card>

      <GuideCard guide="spending" titleKey="guide.spendingTitle" bodyKey="guide.spendingBody" />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3" aria-label={t("spending.statsLabel")}>
        <SpendingMetric
          label={t("spending.totalSpent")}
          value={formatMoney(spendingStats.totalSpentRsd, language)}
        />
        <SpendingMetric label={t("spending.entries")} value={spendingStats.entryCount} />
        <SpendingMetric label={t("spending.packsBought")} value={spendingStats.totalPacks || "-"} />
        <SpendingMetric label={t("spending.stickersFromPacks")} value={spendingStats.totalStickers || "-"} />
        <SpendingMetric
          label={t("spending.averagePackPrice")}
          value={spendingStats.averagePackPriceRsd ? formatMoney(spendingStats.averagePackPriceRsd, language) : "-"}
        />
        <SpendingMetric
          label={t("spending.costPerSticker")}
          value={spendingStats.costPerOwnedStickerRsd ? formatMoney(spendingStats.costPerOwnedStickerRsd, language) : "-"}
        />
      </section>

      {formOpen ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-black text-ink dark:text-white">
              {editingId ? t("spending.edit") : t("spending.add")}
            </h2>
            <Button
              className="min-h-10 px-3"
              onClick={() => {
                resetForm();
                setFormOpen(false);
              }}
            >
              <X size={17} />
              {t("common.cancel")}
            </Button>
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label={t("spending.packsOptional")}>
              <input
                value={form.packsCount}
                onChange={(event) => updateForm("packsCount", event.target.value)}
                className="w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                inputMode="numeric"
                min="0"
                type="number"
              />
              <span className="mt-1 block text-xs font-bold text-neutral-500 dark:text-neutral-400">
                {t("spending.packFormula", { stickers: STICKERS_PER_PACK, price: formatMoney(PACK_PRICE_RSD, language) })}
              </span>
            </FormField>
            <FormField label={t("spending.autoCalculation")}>
              <div className="rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
                {t("spending.total")}: {formatMoney(calculatePackSpending(Number(form.packsCount) || 0), language)}
              </div>
            </FormField>
            <FormField label={t("spending.category")}>
              <select
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value as SpendingCategory)}
                className="w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {t(categoryKey(category))}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("spending.date")}>
              <input
                value={form.date}
                onChange={(event) => updateForm("date", event.target.value)}
                className="w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                type="date"
              />
            </FormField>
            <FormField label={t("spending.amountOverride")}>
              <input
                value={form.amount}
                onChange={(event) => updateForm("amount", event.target.value)}
                className="w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                inputMode="decimal"
                min="0"
                step="0.01"
                type="number"
              />
            </FormField>
            <FormField label={t("spending.stickersOptional")}>
              <input
                value={form.stickersCount}
                onChange={(event) => updateForm("stickersCount", event.target.value)}
                className="w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                inputMode="numeric"
                min="0"
                type="number"
              />
            </FormField>
            <FormField className="sm:col-span-2" label={t("spending.note")}>
              <textarea
                value={form.note}
                onChange={(event) => updateForm("note", event.target.value)}
                className="min-h-24 w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </FormField>
            {error ? (
              <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral sm:col-span-2">{error}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
              <Button className="flex-1" tone="primary" type="submit">
                <Save size={19} />
                {editingId ? t("spending.update") : t("spending.save")}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-xl font-black text-ink dark:text-white">{t("spending.history")}</h2>
        {sortedEntries.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={Wallet}
              title={t("spending.empty")}
              body={t("spending.emptyBody")}
              actionLabel={t("spending.emptyAction")}
              onAction={startAdd}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border border-line bg-field p-3 dark:border-white/10 dark:bg-neutral-950"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-ink dark:text-white">
                        {formatMoney(getEntryAmountRsd(entry), language)}
                      </p>
                      <Badge>{t(categoryKey(entry.category))}</Badge>
                      {entry.linkedEntryId ? <Badge tone="success">{t("spending.linkedEntry")}</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{entry.date}</p>
                    {entry.note ? (
                      <p className="mt-2 text-sm font-semibold leading-6 text-neutral-700 dark:text-neutral-300">
                        {entry.note}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-neutral-500 dark:text-neutral-400">
                      {entry.packsCount ? <span>{t("spending.packsValue", { count: entry.packsCount })}</span> : null}
                      {entry.stickersCount ? (
                        <span>{t("spending.stickersValue", { count: entry.stickersCount })}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:w-36">
                    <Button className="min-h-10 px-3 text-sm" onClick={() => startEdit(entry)}>
                      <Pencil size={16} />
                      {t("spending.editShort")}
                    </Button>
                    <Button className="min-h-10 px-3 text-sm" tone="danger" onClick={() => setDeleteId(entry.id)}>
                      <Trash2 size={16} />
                      {t("spending.deleteShort")}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t("spending.deleteConfirmTitle")}
        body={t("spending.deleteConfirmBody")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("spending.delete")}
        confirmTone="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SpendingMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-line bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase leading-5 text-neutral-500 dark:text-neutral-400">{label}</span>
        <Wallet className="text-pitch" size={17} />
      </div>
      <p className="mt-2 break-words text-xl font-black text-ink dark:text-white">{value}</p>
    </article>
  );
}

function FormField({
  children,
  className,
  label
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-black text-ink dark:text-white">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
