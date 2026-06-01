"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, Minus, Plus, X } from "lucide-react";
import { StickerImage } from "@/features/stickers/StickerImage";
import { useI18n } from "@/hooks/useI18n";
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
  const { t } = useI18n();

  if (!sticker) notFound();

  const status = quantity === 0 ? t("status.missing") : quantity === 1 ? t("status.owned") : t("status.duplicate");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <ArrowLeft size={18} />
        {t("detail.back")}
      </Link>

      <section className="grid gap-5 rounded-lg border border-line bg-white p-5 shadow-lift dark:border-white/10 dark:bg-neutral-900 md:grid-cols-[280px_1fr]">
        <div>
          <StickerImage
            sticker={sticker}
            quantity={quantity}
            className="mx-auto aspect-[3/4] w-full max-w-72"
            sizes="(max-width: 768px) 288px, 280px"
          />
          {sticker.imageUrl ? (
            <a
              href={sticker.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-field text-sm font-black text-ink dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            >
              <ExternalLink size={18} />
              {t("sticker.openImage")}
            </a>
          ) : null}
        </div>

        <div>
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
              aria-label={t("sticker.decreaseQuantity")}
            >
              <Minus size={22} />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">{t("sticker.quantity")}</p>
              <p className="text-4xl font-black text-ink dark:text-white">{quantity}</p>
            </div>
            <button
              type="button"
              className="grid h-14 w-14 place-items-center rounded-lg bg-pitch text-white"
              onClick={() => increment(sticker.code)}
              aria-label={t("sticker.increaseQuantity")}
            >
              <Plus size={22} />
            </button>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <DetailAction label={t("sticker.markMissing")} icon={<X size={18} />} onClick={() => setQuantity(sticker.code, 0)} />
            <DetailAction label={t("sticker.markOwned")} icon={<Check size={18} />} onClick={() => setQuantity(sticker.code, 1)} />
            <DetailAction label={t("sticker.markDuplicate")} icon={<Copy size={18} />} onClick={() => setQuantity(sticker.code, 2)} />
          </div>
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
