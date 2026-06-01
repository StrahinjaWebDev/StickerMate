"use client";

import { translate, type TranslationKey } from "@/lib/i18n";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function useI18n() {
  const language = useCollectionStore((state) => state.language);
  const setLanguage = useCollectionStore((state) => state.setLanguage);

  return {
    language,
    setLanguage,
    t: (key: TranslationKey, params?: Record<string, string | number>) => translate(language, key, params)
  };
}
