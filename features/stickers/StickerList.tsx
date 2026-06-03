"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ClipboardX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { filterStickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { StickerRow } from "@/features/stickers/StickerRow";
import { useI18n } from "@/hooks/useI18n";
import type { Sticker, StickerFilter } from "@/types/sticker";

export function StickerList({
  list,
  query,
  filter,
  variant = "default",
  heightClassName = "h-[620px]"
}: {
  list: Sticker[];
  query: string;
  filter: StickerFilter;
  variant?: "default" | "duplicates";
  heightClassName?: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const isDuplicateView = variant === "duplicates";

  const quantities = useCollectionStore((state) => state.quantities);
  const increment = useCollectionStore((state) => state.increment);
  const decrement = useCollectionStore((state) => state.decrement);
  const { t } = useI18n();

  const filtered = useMemo(() => filterStickers(list, quantities, filter, query), [filter, list, quantities, query]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isDuplicateView ? 108 : 96),
    overscan: 12
  });

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={ClipboardX}
        title={isDuplicateView ? t("empty.noSearchDuplicates") : t("empty.noStickers")}
        body={isDuplicateView ? t("empty.noSearchDuplicatesBody") : t("empty.noStickersBody")}
      />
    );
  }

  return (
    <div ref={parentRef} className={`${heightClassName} overflow-auto rounded-lg`}>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const sticker = filtered[virtualRow.index];
          const quantity = quantities[sticker.code] ?? 0;

          return (
            <div
              key={sticker.code}
              className="absolute left-0 top-0 w-full pb-3"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <StickerRow
                sticker={sticker}
                quantity={quantity}
                variant={variant}
                onIncrement={() => increment(sticker.code)}
                onDecrement={() => decrement(sticker.code)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
