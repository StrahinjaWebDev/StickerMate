"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, Layers3, Moon, RotateCcw, Sun, Wand2 } from "lucide-react";
import { clsx } from "clsx";
import { AccountSection } from "@/components/AccountSection";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GuideCard } from "@/components/GuideCard";
import { Button, Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import { formatMoney } from "@/lib/spending";
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
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "onboarding" | "reset">(null);
  const theme = useCollectionStore((state) => state.theme);
  const packPriceRsd = useCollectionStore((state) => state.packPriceRsd);
  const stickersPerPack = useCollectionStore((state) => state.stickersPerPack);
  const setTheme = useCollectionStore((state) => state.setTheme);
  const setPackSettings = useCollectionStore((state) => state.setPackSettings);
  const setOnboarded = useCollectionStore((state) => state.setOnboarded);
  const resetCollection = useCollectionStore((state) => state.resetCollection);
  const resetReview = useCollectionStore((state) => state.resetReview);
  const resetGuides = useCollectionStore((state) => state.resetGuides);
  const { language, t } = useI18n();
  const resetWord = language === "sr" ? "resetuj" : "reset";

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
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("settings.body")}</p>
      </Card>

      <GuideCard guide="settings" titleKey="guide.settingsTitle" bodyKey="guide.settingsBody" />

      <AccountSection />

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white">{t("settings.appearance")}</h2>
        <p className="mt-4 text-sm font-black text-neutral-500 dark:text-neutral-400">{t("settings.theme")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-field p-1 dark:bg-neutral-950">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={clsx(
                "flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-black transition active:scale-[0.98]",
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
        <h2 className="text-lg font-black text-ink dark:text-white">{t("settings.spending")}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("settings.packSettingsBody")}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-sm font-black text-ink dark:text-white">{t("spending.packPrice")}</span>
            <input
              value={packPriceRsd}
              onChange={(event) => setPackSettings({ packPriceRsd: Number(event.target.value) || 150, stickersPerPack })}
              className="mt-1 w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              inputMode="decimal"
              min="1"
              type="number"
            />
          </label>
          <label>
            <span className="text-sm font-black text-ink dark:text-white">{t("spending.stickersPerPack")}</span>
            <input
              value={stickersPerPack}
              onChange={(event) => setPackSettings({ packPriceRsd, stickersPerPack: Number(event.target.value) || 7 })}
              className="mt-1 w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              inputMode="numeric"
              min="1"
              type="number"
            />
          </label>
        </div>
        <p className="mt-3 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
          {t("spending.packFormula", { stickers: stickersPerPack, price: formatMoney(packPriceRsd, language) })}
          <span className="mt-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            {t("spending.baseRsdNote", { price: packPriceRsd })}
          </span>
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white">{t("settings.collectionData")}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <SettingsButton icon={<Layers3 size={19} />} label={t("settings.restartReview")} onClick={handleRestartReview} />
          <SettingsButton icon={<Wand2 size={19} />} label={t("settings.onboarding")} onClick={() => setDialog("onboarding")} />
          <SettingsButton icon={<HelpCircle size={19} />} label={t("settings.showHelpAgain")} onClick={handleShowHelpAgain} />
        </div>
        {message ? <p className="mt-4 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{message}</p> : null}
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

      <Card>
        <h2 className="text-lg font-black text-ink dark:text-white">{t("about.title")}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("about.unofficial")} {t("about.affiliation")}
        </p>
        <p className="mt-3 rounded-lg bg-field p-3 text-sm font-semibold leading-6 text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">
          {t("app.storageNotice")}
        </p>
        <p className="mt-3 text-xs font-bold leading-5 text-neutral-500 dark:text-neutral-400">
          {t("app.copyright")}
          <br />
          {t("app.owner")}
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
        typedConfirmation={{ label: t("settings.resetTypedLabel", { word: resetWord }), value: resetWord }}
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
    <Button className="w-full active:scale-[0.98]" tone={danger ? "danger" : "neutral"} onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}
