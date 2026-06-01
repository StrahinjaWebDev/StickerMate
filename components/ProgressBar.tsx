"use client";

import { formatPercent } from "@/lib/stickers";
import { useI18n } from "@/hooks/useI18n";

export function ProgressBar({ value }: { value: number }) {
  const { t } = useI18n();
  const percent = formatPercent(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-bold text-neutral-700 dark:text-neutral-300">
        <span>{t("progress.complete", { percent })}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-pitch transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
