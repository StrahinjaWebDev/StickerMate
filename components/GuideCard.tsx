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
    <section className="rounded-lg border border-line bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-field text-pitch dark:bg-neutral-950">
          <Info size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-1.5">
            <div className="line-clamp-2 min-w-0 text-xs font-semibold leading-5 text-neutral-700 dark:text-neutral-300">
              <span className="font-black text-ink dark:text-white">{t(titleKey)}</span>
              <span className="mx-1 text-neutral-400">-</span>
              <span>{t(bodyKey)}</span>
            </div>
            <Button
              className="min-h-8 shrink-0 px-2 text-xs"
              onClick={() => dismissGuide(guide)}
              aria-label={t("guide.gotIt")}
            >
              <X size={14} />
            </Button>
          </div>
          <Link
            href={helpHref}
            className="mt-1 inline-flex min-h-8 items-center rounded-md px-1 text-xs font-black text-pitch hover:bg-field dark:hover:bg-neutral-950"
          >
            {t("guide.more")}
          </Link>
        </div>
      </div>
    </section>
  );
}
