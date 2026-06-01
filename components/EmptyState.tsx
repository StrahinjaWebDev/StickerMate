import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-line bg-white/60 p-8 text-center dark:border-white/10 dark:bg-neutral-900/50">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-neutral-100 text-pitch dark:bg-neutral-800">
          <Icon size={24} />
        </span>
        <h2 className="mt-4 text-lg font-black text-ink dark:text-white">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600 dark:text-neutral-400">{body}</p>
      </div>
    </div>
  );
}
