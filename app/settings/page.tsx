"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, Moon, RotateCcw, Sun, Upload, Wand2 } from "lucide-react";
import { clsx } from "clsx";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { ThemePreference } from "@/types/sticker";

const themeOptions: Array<{ value: ThemePreference; label: string; icon: React.ReactNode }> = [
  { value: "system", label: "System", icon: <Wand2 size={18} /> },
  { value: "light", label: "Light", icon: <Sun size={18} /> },
  { value: "dark", label: "Dark", icon: <Moon size={18} /> }
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

  function handleExport() {
    const payload = exportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stickermate-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Collection exported.");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text());
      const result = importPayload(payload);
      setMessage(result.ok ? "Collection imported." : result.error);
    } catch {
      setMessage("That file could not be read as JSON.");
    } finally {
      event.target.value = "";
    }
  }

  function handleReset() {
    const confirmed = window.confirm("Reset all sticker quantities?");
    if (!confirmed) return;
    resetCollection();
    setMessage("Collection reset.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-3xl font-black text-ink dark:text-white">Settings</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          Autosave is always on. Your collection stays on this device.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h2 className="text-lg font-black text-ink dark:text-white">Appearance</h2>
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
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h2 className="text-lg font-black text-ink dark:text-white">Collection Data</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <SettingsButton icon={<Download size={19} />} label="Export Collection" onClick={handleExport} />
          <SettingsButton icon={<Upload size={19} />} label="Import Collection" onClick={() => inputRef.current?.click()} />
          <SettingsButton icon={<Wand2 size={19} />} label="Run Onboarding Again" onClick={() => setOnboarded(false)} />
          <SettingsButton icon={<RotateCcw size={19} />} label="Reset Collection" onClick={handleReset} danger />
        </div>
        <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={handleImport} />
        {message ? <p className="mt-4 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">{message}</p> : null}
      </section>
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
    <button
      type="button"
      className={clsx(
        "flex min-h-12 items-center justify-center gap-2 rounded-lg border px-4 font-black shadow-sm",
        danger
          ? "border-coral/30 bg-coral/10 text-coral"
          : "border-line bg-white text-ink dark:border-white/10 dark:bg-neutral-950 dark:text-white"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
