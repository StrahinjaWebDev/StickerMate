"use client";

import { HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/lib/i18n";

const helpSections: Array<{ titleKey: TranslationKey; bodyKey: TranslationKey }> = [
  { titleKey: "help.startTitle", bodyKey: "help.startBody" },
  { titleKey: "help.entryTitle", bodyKey: "help.entryBody" },
  { titleKey: "help.statusTitle", bodyKey: "help.statusBody" },
  { titleKey: "help.reviewTitle", bodyKey: "help.reviewBody" },
  { titleKey: "help.collectionTitle", bodyKey: "help.collectionBody" },
  { titleKey: "help.teamsTitle", bodyKey: "help.teamsBody" },
  { titleKey: "help.duplicatesTitle", bodyKey: "help.duplicatesBody" },
  { titleKey: "help.spendingTitle", bodyKey: "help.spendingBody" },
  { titleKey: "help.tradesTitle", bodyKey: "help.tradesBody" },
  { titleKey: "help.qrTitle", bodyKey: "help.qrBody" },
  { titleKey: "help.backupTitle", bodyKey: "help.backupBody" },
  { titleKey: "help.phoneTitle", bodyKey: "help.phoneBody" }
];

export default function HelpPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="shadow-lift">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <HelpCircle size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">{t("help.title")}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
              {t("help.body")}
            </p>
          </div>
        </div>
      </Card>

      <section className="space-y-2">
        {helpSections.map((section) => (
          <details
            key={section.titleKey}
            className="rounded-lg border border-line bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-4"
          >
            <summary className="cursor-pointer text-sm font-black text-ink dark:text-white sm:text-base">
              {t(section.titleKey)}
            </summary>
            <p className="mt-2 text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
              {t(section.bodyKey)}
            </p>
          </details>
        ))}
      </section>
    </div>
  );
}
