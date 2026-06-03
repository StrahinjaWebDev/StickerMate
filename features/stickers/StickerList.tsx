"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ClipboardX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { filterStickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";
import type { PaintMode } from "@/features/stickers/StickerRow";
import { StickerRow } from "@/features/stickers/StickerRow";
import { useI18n } from "@/hooks/useI18n";
import type { Sticker, StickerFilter } from "@/types/sticker";

export function StickerList({
  list,
  query,
  filter,
  heightClassName = "h-[620px]"
}: {
  list: Sticker[];
  query: string;
  filter: StickerFilter;
  heightClassName?: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [paintMode, setPaintMode] = useState<PaintMode | null>(null);
  const paintedCodes = useRef(new Set<string>());

  const quantities = useCollectionStore((state) => state.quantities);
  const increment = useCollectionStore((state) => state.increment);
  const decrement = useCollectionStore((state) => state.decrement);
  const setQuantity = useCollectionStore((state) => state.setQuantity);
  const toggleSelected = useCollectionStore((state) => state.toggleSelected);
  const selectedCodes = useCollectionStore((state) => state.selectedCodes);
  const { t } = useI18n();

  const filtered = useMemo(() => filterStickers(list, quantities, filter, query), [filter, list, quantities, query]);
  const selected = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 138,
    overscan: 10
  });

  const applyPaint = useCallback(
    (mode: PaintMode, code: string) => {
      if (paintedCodes.current.has(code)) return;
      paintedCodes.current.add(code);
      if (mode === "owned") setQuantity(code, 1);
      if (mode === "missing") setQuantity(code, 0);
      if (mode === "duplicate") setQuantity(code, 2);
    },
    [setQuantity]
  );

  const startPaint = useCallback(
    (mode: PaintMode, code: string) => {
      paintedCodes.current = new Set();
      setPaintMode(mode);
      applyPaint(mode, code);
    },
    [applyPaint]
  );

  const stopPaint = useCallback(() => {
    setPaintMode(null);
    paintedCodes.current = new Set();
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!paintMode) return;
      const element = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-sticker-code]");
      const code = element?.getAttribute("data-sticker-code");
      if (code) applyPaint(paintMode, code);
    },
    [applyPaint, paintMode]
  );

  if (filtered.length === 0) {
    return <EmptyState icon={ClipboardX} title={t("empty.noStickers")} body={t("empty.noStickersBody")} />;
  }

  return (
    <div
      ref={parentRef}
      className={`${heightClassName} overflow-auto rounded-lg`}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPaint}
      onPointerCancel={stopPaint}
      onPointerLeave={stopPaint}
    >
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
                selected={selected.has(sticker.code)}
                onIncrement={() => increment(sticker.code)}
                onDecrement={() => decrement(sticker.code)}
                onToggleSelected={() => toggleSelected(sticker.code)}
                onPaintStart={startPaint}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
