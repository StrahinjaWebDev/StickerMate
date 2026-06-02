"use client";

import { Info, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="shadow-lift">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Info size={22} />
          </span>
          <div>
            <h1 className="text-3xl font-black text-ink dark:text-white">{t("about.title")}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
              {t("about.body")}
            </p>
            <p className="mt-2 text-xs font-bold leading-5 text-neutral-500 dark:text-neutral-400">
              {t("app.copyright")} {t("app.owner")}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-xl font-black text-ink dark:text-white">
          <ShieldCheck size={21} className="text-pitch" />
          {t("about.disclaimerTitle")}
        </h2>
        <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-neutral-700 dark:text-neutral-300">
          <p>{t("about.unofficial")}</p>
          <p>{t("about.affiliation")}</p>
          <p>{t("about.referenceUse")}</p>
        </div>
      </Card>
    </div>
  );
}
