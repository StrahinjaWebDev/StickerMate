"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTypedValue("");
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  const disabled = typedConfirmation ? typedValue !== typedConfirmation.value : false;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overscroll-contain bg-ink/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"
      onClick={() => {
        setTypedValue("");
        onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        tabIndex={-1}
        className="animate-status-in max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-md overflow-y-auto rounded-lg border border-line bg-white p-5 shadow-lift outline-none dark:border-white/10 dark:bg-neutral-900"
        onClick={(event) => event.stopPropagation()}
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
          <Button
            onClick={() => {
              setTypedValue("");
              onCancel();
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            tone={confirmTone}
            disabled={disabled}
            onClick={() => {
              setTypedValue("");
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
