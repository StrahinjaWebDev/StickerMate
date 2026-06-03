"use client";

import { clsx } from "clsx";

export function StatusMessage({
  children,
  className
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <p
      role="status"
      className={clsx(
        "animate-status-in rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300",
        className
      )}
    >
      {children}
    </p>
  );
}
