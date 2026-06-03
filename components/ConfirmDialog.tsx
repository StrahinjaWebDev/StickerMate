"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Primitives";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  confirmTone = "primary",
  typedConfirmation,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: "primary" | "danger";
  typedConfirmation?: {
    label: string;
    value: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typedValue, setTypedValue] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTypedValue("");
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  const disabled = typedConfirmation ? typedValue !== typedConfirmation.value : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900"
      >
        <h2 id="confirm-dialog-title" className="text-xl font-black text-ink dark:text-white">
          {title}
        </h2>
        <p id="confirm-dialog-body" className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {body}
        </p>
        {typedConfirmation ? (
          <label className="mt-4 block">
            <span className="text-sm font-black text-ink dark:text-white">{typedConfirmation.label}</span>
            <input
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              aria-required="true"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border-line bg-field font-semibold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            />
          </label>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={() => {
            setTypedValue("");
            onCancel();
          }}>{cancelLabel}</Button>
          <Button tone={confirmTone} disabled={disabled} onClick={() => {
            setTypedValue("");
            onConfirm();
          }}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
