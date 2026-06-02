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
    <section className="rounded-lg border border-pitch/20 bg-pitch/10 px-3 py-2 shadow-sm dark:border-pitch/30 dark:bg-pitch/15">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-pitch shadow-sm dark:bg-neutral-900">
          <Info size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-xs font-black text-ink dark:text-white">{t(titleKey)}</h2>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-neutral-700 dark:text-neutral-300">{t(bodyKey)}</p>
            </div>
            <Button
              className="min-h-9 shrink-0 px-2 text-xs"
              onClick={() => dismissGuide(guide)}
              aria-label={t("guide.gotIt")}
            >
              <X size={14} />
            </Button>
          </div>
          <Link
            href={helpHref}
            className="mt-1 inline-flex min-h-9 items-center rounded-md px-2 text-xs font-black text-pitch hover:bg-white/60 dark:hover:bg-neutral-900"
          >
            {t("guide.more")}
          </Link>
        </div>
      </div>
    </section>
  );
}
