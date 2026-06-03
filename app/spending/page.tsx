"use client";

import { useMemo } from "react";
import { Wallet } from "lucide-react";
import { GuideCard } from "@/components/GuideCard";
import { Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import { formatMoney, getEstimatedSpendingFromCollection, PACK_PRICE_RSD, STICKERS_PER_PACK } from "@/lib/spending";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function SpendingPage() {
  const { language, t } = useI18n();
  const quantities = useCollectionStore((state) => state.quantities);
  const estimate = useMemo(() => getEstimatedSpendingFromCollection(quantities), [quantities]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("spending.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">{t("spending.body")}</p>
        <p className="mt-3 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("spending.packFormula", {
            stickers: STICKERS_PER_PACK,
            price: formatMoney(PACK_PRICE_RSD, language)
          })}
        </p>
      </Card>

      <GuideCard guide="spending" titleKey="guide.spendingTitle" bodyKey="guide.spendingBody" />

      <section className="grid gap-3 sm:grid-cols-2" aria-label={t("spending.statsLabel")}>
        <SpendingMetric label={t("spending.packsBought")} value={estimate.boughtPacks} />
        <SpendingMetric label={t("spending.totalStickers")} value={estimate.totalPhysicalStickers} />
        <SpendingMetric label={t("spending.packPrice")} value={formatMoney(estimate.packPriceRsd, language)} />
        <SpendingMetric label={t("spending.costPerSticker")} value={formatMoney(estimate.pricePerStickerRsd, language)} />
      </section>

      <Card>
        <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("spending.totalSpent")}</p>
        <p className="mt-2 text-3xl font-black text-ink dark:text-white">{formatMoney(estimate.totalSpentRsd, language)}</p>
      </Card>
    </div>
  );
}

function SpendingMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase leading-5 text-neutral-500 dark:text-neutral-400">{label}</span>
        <Wallet className="text-pitch" size={17} />
      </div>
      <p className="mt-2 break-words text-2xl font-black text-ink dark:text-white">{value}</p>
    </article>
  );
}
