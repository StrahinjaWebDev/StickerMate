"use client";

import { useEffect } from "react";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function ThemeHydrator() {
  const theme = useCollectionStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = theme === "dark" || (theme === "system" && systemDark);

    root.classList.toggle("dark", shouldUseDark);
  }, [theme]);

  return null;
}
