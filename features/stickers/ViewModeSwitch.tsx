"use client";

import { Grid2X2, List } from "lucide-react";
import { clsx } from "clsx";
import { useI18n } from "@/hooks/useI18n";
import type { StickerViewMode } from "@/types/sticker";

export function ViewModeSwitch({
  value,
  onChange
}: {
  value: StickerViewMode;
  onChange: (value: StickerViewMode) => void;
}) {
  const { t } = useI18n();
  const options = [
    { value: "list" as const, labelKey: "view.list" as const, icon: List },
    { value: "grid" as const, labelKey: "view.grid" as const, icon: Grid2X2 }
  ];

  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-200/70 p-1 dark:bg-neutral-900" aria-label={t("view.label")}>
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            className={clsx(
              "flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition",
              value === option.value
                ? "bg-white text-pitch shadow-sm dark:bg-neutral-800"
                : "text-neutral-600 dark:text-neutral-300"
            )}
            onClick={() => onChange(option.value)}
          >
            <Icon size={18} />
            {t(option.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
