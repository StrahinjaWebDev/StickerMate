"use client";

import { clsx } from "clsx";
import { languages } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-line bg-white p-1 shadow-sm dark:border-white/10 dark:bg-neutral-900"
      aria-label={t("language.label")}
    >
      {languages.map((item) => (
        <button
          key={item.code}
          type="button"
          className={clsx(
            "flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch sm:min-h-10 sm:px-2.5",
            language === item.code
              ? "bg-pitch text-white"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          )}
          onClick={() => setLanguage(item.code)}
          aria-pressed={language === item.code}
        >
          <span aria-hidden="true">{item.flag}</span>
          <span className="sm:hidden">{item.shortLabel}</span>
          <span className="hidden sm:inline">{t(item.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
