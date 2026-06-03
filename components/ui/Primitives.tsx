import { clsx } from "clsx";

export function Card({
  children,
  className,
  ...props
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}> & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={clsx(
        "min-w-0 rounded-lg border border-line bg-white p-4 shadow-sm motion-safe:transition-shadow motion-safe:duration-200 md:motion-safe:hover:shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  className,
  tone = "neutral",
  ...props
}: Readonly<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "primary" | "neutral" | "danger";
  }
>) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-lg px-4 font-black shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[transform,background-color,border-color,color] motion-safe:duration-150 motion-safe:active:scale-[0.98]",
        tone === "primary" && "bg-pitch text-white hover:bg-pitch/90",
        tone === "neutral" &&
          "border border-line bg-white text-ink hover:bg-field dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800",
        tone === "danger" && "border border-coral/30 bg-coral/10 text-coral hover:bg-coral/15",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  className,
  tone = "neutral"
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "danger" | "gold";
}>) {
  return (
    <span
      className={clsx(
        "inline-flex min-w-0 items-center rounded-md px-2 py-1 text-xs font-black",
        tone === "neutral" && "bg-field text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300",
        tone === "success" && "bg-pitch/10 text-pitch",
        tone === "danger" && "bg-coral/10 text-coral",
        tone === "gold" && "bg-gold/20 text-yellow-800 dark:text-gold",
        className
      )}
    >
      {children}
    </span>
  );
}
