"use client";

import { useEffect } from "react";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function ThemeHydrator() {
  const theme = useCollectionStore((state) => state.theme);
  const language = useCollectionStore((state) => state.language);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = theme === "dark" || (theme === "system" && systemDark);

    root.classList.toggle("dark", shouldUseDark);
    root.lang = language;
  }, [language, theme]);

  return null;
}
