"use client";

import { Check, Copy, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useCollectionStore } from "@/stores/useCollectionStore";

export function BulkActions() {
  const selectedCodes = useCollectionStore((state) => state.selectedCodes);
  const markMany = useCollectionStore((state) => state.markMany);
  const clearSelection = useCollectionStore((state) => state.clearSelection);
  const { t } = useI18n();

  if (selectedCodes.length === 0) return null;

  return (
    <div className="sticky top-[73px] z-20 rounded-lg border border-line bg-white p-2 shadow-lift dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="shrink-0 px-2 text-sm font-black text-ink dark:text-white">
          {t("bulk.selected", { count: selectedCodes.length })}
        </span>
        <Action label={t("bulk.owned")} icon={<Check size={18} />} onClick={() => markMany(selectedCodes, 1)} />
        <Action label={t("bulk.missing")} icon={<X size={18} />} onClick={() => markMany(selectedCodes, 0)} />
        <Action label={t("bulk.duplicate")} icon={<Copy size={18} />} onClick={() => markMany(selectedCodes, 2)} />
        <Action label="+1" icon={<Plus size={18} />} onClick={() => markMany(selectedCodes, "increment")} />
        <Action label="-1" icon={<Minus size={18} />} onClick={() => markMany(selectedCodes, "decrement")} />
        <Action label={t("bulk.reset")} icon={<RotateCcw size={18} />} onClick={clearSelection} subtle />
      </div>
    </div>
  );
}

function Action({
  label,
  icon,
  onClick,
  subtle = false
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        subtle
          ? "flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-line px-3 text-sm font-black text-neutral-700 dark:border-white/10 dark:text-neutral-300"
          : "flex min-h-10 shrink-0 items-center gap-1 rounded-lg bg-pitch px-3 text-sm font-black text-white"
      }
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
