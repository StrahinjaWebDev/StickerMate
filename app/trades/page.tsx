"use client";

import { Handshake } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useI18n } from "@/hooks/useI18n";

export default function TradesPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("trades.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {t("trades.body")}
        </p>
      </section>
      <EmptyState
        icon={Handshake}
        title={t("trades.emptyTitle")}
        body={t("trades.emptyBody")}
      />
    </div>
  );
}
