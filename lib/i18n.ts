import en from "@/locales/en.json";
import sr from "@/locales/sr.json";
import type { LanguageCode } from "@/types/sticker";

export const defaultLanguage: LanguageCode = "sr";

export const languages: Array<{ code: LanguageCode; labelKey: TranslationKey; shortLabel: string; flag: string }> = [
  { code: "sr", labelKey: "language.sr", shortLabel: "SR", flag: "🇷🇸" },
  { code: "en", labelKey: "language.en", shortLabel: "EN", flag: "🇬🇧" }
];

const dictionaries = { sr, en };

export type TranslationKey = keyof typeof en;

export function translate(language: LanguageCode, key: TranslationKey, params?: Record<string, string | number>) {
  const template = dictionaries[language][key] ?? dictionaries[defaultLanguage][key] ?? key;
  if (!params) return template;

  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}
