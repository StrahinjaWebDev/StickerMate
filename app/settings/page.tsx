"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, Moon, RotateCcw, Sun, Upload, Wand2 } from "lucide-react";
import { clsx } from "clsx";
import { Button, Card } from "@/components/ui/Primitives";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/hooks/useI18n";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { ThemePreference } from "@/types/sticker";

const themeOptions: Array<{ value: ThemePreference; labelKey: "settings.system" | "settings.light" | "settings.dark"; icon: React.ReactNode }> = [
  { value: "system", labelKey: "settings.system", icon: <Wand2 size={18} /> },
  { value: "light", labelKey: "settings.light", icon: <Sun size={18} /> },
  { value: "dark", labelKey: "settings.dark", icon: <Moon size={18} /> }
];

export default function SettingsPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const theme = useCollectionStore((state) => state.theme);
  const setTheme = useCollectionStore((state) => state.setTheme);
  const setOnboarded = useCollectionStore((state) => state.setOnboarded);
  const resetCollection = useCollectionStore((state) => state.resetCollection);
  const exportPayload = useCollectionStore((state) => state.exportPayload);
  const importPayload = useCollectionStore((state) => state.importPayload);
  const { t } = useI18n();

  function handleExport() {
    const payload = exportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stickermate-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(t("settings.exported"));
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text());
      const result = importPayload(payload);
      setMessage(result.ok ? t("settings.imported") : t(result.errorKey));
    } catch {
      setMessage(t("settings.importReadError"));
    } finally {
      event.target.value = "";
    }
  }

  function handleReset() {
    const confirmed = window.confirm(t("settings.resetConfirm"));
    if (!confirmed) return;
    resetCollection();
    setMessage(t("settings.resetDone"));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("settings.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {t("settings.body")}
        </p>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-ink dark:text-white">{t("settings.appearance")}</h2>
          <div>
            <p className="sr-only">{t("settings.language")}</p>
            <LanguageSwitcher />
          </div>
        </div>
        <p className="mt-4 text-sm font-black text-neutral-500 dark:text-neutral-400">{t("settings.theme")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-field p-1 dark:bg-neutral-950">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={clsx(
                "flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-black transition",
                theme === option.value
                  ? "bg-white text-pitch shadow-sm dark:bg-neutral-800"
                  : "text-neutral-600 dark:text-neutral-300"
              )}
              onClick={() => setTheme(option.value)}
            >
              {option.icon}
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white">{t("settings.collectionData")}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <SettingsButton icon={<Download size={19} />} label={t("settings.export")} onClick={handleExport} />
          <SettingsButton icon={<Upload size={19} />} label={t("settings.import")} onClick={() => inputRef.current?.click()} />
          <SettingsButton icon={<Wand2 size={19} />} label={t("settings.onboarding")} onClick={() => setOnboarded(false)} />
          <SettingsButton icon={<RotateCcw size={19} />} label={t("settings.reset")} onClick={handleReset} danger />
        </div>
        <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={handleImport} />
        {message ? <p className="mt-4 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{message}</p> : null}
      </Card>
    </div>
  );
}

function SettingsButton({
  icon,
  label,
  onClick,
  danger = false
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Button className="w-full" tone={danger ? "danger" : "neutral"} onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}
