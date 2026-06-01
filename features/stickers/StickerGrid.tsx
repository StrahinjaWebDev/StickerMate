"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ClipboardX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StickerCard } from "@/features/stickers/StickerCard";
import { useI18n } from "@/hooks/useI18n";
import { filterStickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { Sticker, StickerFilter } from "@/types/sticker";

export function StickerGrid({
  list,
  query,
  filter,
  heightClassName = "h-[680px]"
}: {
  list: Sticker[];
  query: string;
  filter: StickerFilter;
  heightClassName?: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(360);
  const quantities = useCollectionStore((state) => state.quantities);
  const increment = useCollectionStore((state) => state.increment);
  const decrement = useCollectionStore((state) => state.decrement);
  const { t } = useI18n();

  const filtered = useMemo(() => filterStickers(list, quantities, filter, query), [filter, list, quantities, query]);
  const columns = width >= 1080 ? 5 : width >= 820 ? 4 : width >= 560 ? 3 : 2;
  const rowCount = Math.ceil(filtered.length / columns);
  const rowHeight = width >= 560 ? 282 : 252;

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 3
  });

  if (filtered.length === 0) {
    return <EmptyState icon={ClipboardX} title={t("empty.noStickers")} body={t("empty.noStickersBody")} />;
  }

  return (
    <div ref={parentRef} className={`${heightClassName} overflow-auto rounded-lg`}>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowStart = virtualRow.index * columns;
          const rowStickers = filtered.slice(rowStart, rowStart + columns);

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full gap-2 pb-3 sm:gap-3"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
              }}
            >
              {rowStickers.map((sticker) => (
                <StickerCard
                  key={sticker.code}
                  sticker={sticker}
                  quantity={quantities[sticker.code] ?? 0}
                  onIncrement={() => increment(sticker.code)}
                  onDecrement={() => decrement(sticker.code)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
