"use client";

import Link from "next/link";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { TranslationKey } from "@/lib/i18n";
import type { GuideKey } from "@/types/sticker";

export function GuideCard({
  guide,
  titleKey,
  bodyKey,
  helpHref = "/help"
}: {
  guide: GuideKey;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  helpHref?: string;
}) {
  const dismissed = useCollectionStore((state) => state.dismissedGuides[guide]);
  const dismissGuide = useCollectionStore((state) => state.dismissGuide);
  const { t } = useI18n();

  if (dismissed) return null;

  return (
    <section className="rounded-lg border border-pitch/20 bg-pitch/10 p-3 shadow-sm dark:border-pitch/30 dark:bg-pitch/15 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-pitch shadow-sm dark:bg-neutral-900">
          <Info size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-ink dark:text-white">{t(titleKey)}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-neutral-700 dark:text-neutral-300">{t(bodyKey)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="min-h-10 px-3 text-sm" onClick={() => dismissGuide(guide)}>
              <X size={16} />
              {t("guide.gotIt")}
            </Button>
            <Link
              href={helpHref}
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-black text-pitch hover:bg-white/60 dark:hover:bg-neutral-900"
            >
              {t("guide.more")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
