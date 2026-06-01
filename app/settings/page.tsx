"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Layers3, Moon, RotateCcw, Sun, Upload, Wand2 } from "lucide-react";
import { clsx } from "clsx";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GuideCard } from "@/components/GuideCard";
import { Button, Card } from "@/components/ui/Primitives";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/hooks/useI18n";
import { spendingCurrencies } from "@/lib/spending";
import { excludedVariantCount, fullChecklistCount, stickerCount } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { ThemePreference } from "@/types/sticker";

const themeOptions: Array<{ value: ThemePreference; labelKey: "settings.system" | "settings.light" | "settings.dark"; icon: React.ReactNode }> = [
  { value: "system", labelKey: "settings.system", icon: <Wand2 size={18} /> },
  { value: "light", labelKey: "settings.light", icon: <Sun size={18} /> },
  { value: "dark", labelKey: "settings.dark", icon: <Moon size={18} /> }
];

export default function SettingsPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "onboarding" | "reset">(null);
  const theme = useCollectionStore((state) => state.theme);
  const defaultCurrency = useCollectionStore((state) => state.defaultCurrency);
  const setTheme = useCollectionStore((state) => state.setTheme);
  const setDefaultCurrency = useCollectionStore((state) => state.setDefaultCurrency);
  const setOnboarded = useCollectionStore((state) => state.setOnboarded);
  const resetCollection = useCollectionStore((state) => state.resetCollection);
  const resetReview = useCollectionStore((state) => state.resetReview);
  const resetGuides = useCollectionStore((state) => state.resetGuides);
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

  function confirmResetCollection() {
    resetCollection();
    setMessage(t("settings.resetDone"));
    setDialog(null);
  }

  function handleRestartReview() {
    setOnboarded(true);
    resetReview();
    router.push("/review");
  }

  function confirmRunOnboarding() {
    setOnboarded(false);
    setDialog(null);
    router.push("/");
  }

  function handleShowHelpAgain() {
    resetGuides();
    setMessage(t("settings.helpResetDone"));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("settings.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {t("settings.body")}
        </p>
      </Card>

      <GuideCard guide="settings" titleKey="guide.settingsTitle" bodyKey="guide.settingsBody" />

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
          <SettingsButton icon={<Layers3 size={19} />} label={t("settings.restartReview")} onClick={handleRestartReview} />
          <SettingsButton icon={<Wand2 size={19} />} label={t("settings.onboarding")} onClick={() => setDialog("onboarding")} />
          <SettingsButton icon={<Wand2 size={19} />} label={t("settings.showHelpAgain")} onClick={handleShowHelpAgain} />
        </div>
        <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={handleImport} />
        {message ? <p className="mt-4 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{message}</p> : null}
      </Card>

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white">{t("settings.spending")}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("settings.defaultCurrencyBody")}
        </p>
        <p className="mt-4 text-sm font-black text-neutral-500 dark:text-neutral-400">
          {t("settings.defaultCurrency")}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-field p-1 dark:bg-neutral-950">
          {spendingCurrencies.map((currency) => (
            <button
              key={currency}
              type="button"
              className={clsx(
                "min-h-11 rounded-md text-sm font-black transition",
                defaultCurrency === currency
                  ? "bg-white text-pitch shadow-sm dark:bg-neutral-800"
                  : "text-neutral-600 dark:text-neutral-300"
              )}
              onClick={() => setDefaultCurrency(currency)}
            >
              {currency}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white">{t("settings.dataInfoTitle")}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <DataPoint label={t("settings.fullChecklistCount")} value={fullChecklistCount} />
          <DataPoint label={t("settings.albumStickerCount")} value={stickerCount} />
          <DataPoint label={t("settings.excludedVariantCount")} value={excludedVariantCount} />
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("settings.albumScopeNote")}
        </p>
      </Card>

      <Card className="border-coral/25">
        <h2 className="text-lg font-black text-ink dark:text-white">{t("settings.dangerTitle")}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("settings.dangerBody")}
        </p>
        <div className="mt-4">
          <SettingsButton icon={<RotateCcw size={19} />} label={t("settings.reset")} onClick={() => setDialog("reset")} danger />
        </div>
      </Card>

      <ConfirmDialog
        open={dialog === "onboarding"}
        title={t("settings.onboardingConfirmTitle")}
        body={t("settings.onboardingConfirmBody")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("settings.onboardingConfirmAction")}
        onCancel={() => setDialog(null)}
        onConfirm={confirmRunOnboarding}
      />

      <ConfirmDialog
        open={dialog === "reset"}
        title={t("settings.resetConfirmTitle")}
        body={t("settings.resetConfirmBody")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("settings.resetConfirmAction")}
        confirmTone="danger"
        onCancel={() => setDialog(null)}
        onConfirm={confirmResetCollection}
      />
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
      <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink dark:text-white">{value}</p>
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
