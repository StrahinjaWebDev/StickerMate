"use client";

import { Button } from "@/components/ui/Primitives";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  confirmTone = "primary",
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900"
      >
        <h2 id="confirm-dialog-title" className="text-xl font-black text-ink dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{body}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button tone={confirmTone} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
