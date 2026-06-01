"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Minus, Plus, X } from "lucide-react";
import { getSticker } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function StickerDetailPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code).toUpperCase();
  const sticker = getSticker(code);
  const quantity = useCollectionStore((state) => state.quantities[code] ?? 0);
  const increment = useCollectionStore((state) => state.increment);
  const decrement = useCollectionStore((state) => state.decrement);
  const setQuantity = useCollectionStore((state) => state.setQuantity);

  if (!sticker) notFound();

  const status = quantity === 0 ? "Missing" : quantity === 1 ? "Owned" : "Duplicate";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <ArrowLeft size={18} />
        Dashboard
      </Link>

      <section className="rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-pitch">{sticker.code}</p>
            <h1 className="mt-2 text-4xl font-black text-ink dark:text-white">{sticker.name}</h1>
            <p className="mt-2 text-base font-semibold text-neutral-600 dark:text-neutral-400">{sticker.team}</p>
          </div>
          <span className="rounded-lg bg-field px-3 py-2 text-sm font-black text-ink dark:bg-neutral-950 dark:text-white">
            {status}
          </span>
        </div>

        <div className="mt-7 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg bg-field p-3 dark:bg-neutral-950">
          <button
            type="button"
            className="grid h-14 w-14 place-items-center rounded-lg border border-line bg-white text-ink dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            onClick={() => decrement(sticker.code)}
            aria-label="Decrease quantity"
          >
            <Minus size={22} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Quantity</p>
            <p className="text-4xl font-black text-ink dark:text-white">{quantity}</p>
          </div>
          <button
            type="button"
            className="grid h-14 w-14 place-items-center rounded-lg bg-pitch text-white"
            onClick={() => increment(sticker.code)}
            aria-label="Increase quantity"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <DetailAction label="Mark Missing" icon={<X size={18} />} onClick={() => setQuantity(sticker.code, 0)} />
          <DetailAction label="Mark Owned" icon={<Check size={18} />} onClick={() => setQuantity(sticker.code, 1)} />
          <DetailAction label="Mark Duplicate" icon={<Copy size={18} />} onClick={() => setQuantity(sticker.code, 2)} />
        </div>
      </section>
    </div>
  );
}

function DetailAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 font-black text-ink shadow-sm dark:border-white/10 dark:bg-neutral-950 dark:text-white"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
