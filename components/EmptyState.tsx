import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  actionHref,
  onAction
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const actionClassName =
    "mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-pitch px-4 text-sm font-black text-white shadow-sm transition hover:bg-pitch/90 active:scale-[0.98]";

  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-line bg-white/60 p-8 text-center dark:border-white/10 dark:bg-neutral-900/50">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-neutral-100 text-pitch dark:bg-neutral-800">
          <Icon size={24} />
        </span>
        <h2 className="mt-4 text-lg font-black text-ink dark:text-white">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600 dark:text-neutral-400">{body}</p>
        {actionLabel && actionHref ? (
          <Link href={actionHref} className={actionClassName}>
            {actionLabel}
          </Link>
        ) : null}
        {actionLabel && onAction ? (
          <button type="button" className={actionClassName} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
