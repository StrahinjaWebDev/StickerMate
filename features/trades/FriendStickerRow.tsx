"use client";

import { StickerImage } from "@/features/stickers/StickerImage";
import { getTeamIcon } from "@/lib/teamIcons";
import { stickerByCode } from "@/lib/stickers";
import type { Sticker } from "@/types/sticker";

export function FriendStickerRow({
  code,
  contextLabel
}: {
  code: string;
  contextLabel?: string | null;
}) {
  const sticker = stickerByCode.get(code);

  if (!sticker) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-lg bg-field px-3 py-2 dark:bg-neutral-950">
        <span className="font-mono text-sm font-black text-ink dark:text-white">{code}</span>
        {contextLabel ? <ContextBadge label={contextLabel} /> : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-field p-2 dark:bg-neutral-950 sm:gap-3">
      <StickerImage
        sticker={sticker}
        quantity={1}
        className="h-12 w-9 shrink-0 sm:h-14 sm:w-10"
        showTextPlaceholder={false}
        sizes="40px"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-ink dark:text-white">
          <span className="text-neutral-500 dark:text-neutral-400">{sticker.code}</span> {sticker.name}
        </p>
        <p className="truncate text-xs font-bold text-neutral-500 dark:text-neutral-400">
          <span className="mr-1">{getTeamIcon(sticker.team)}</span>
          {sticker.team}
        </p>
      </div>
      {contextLabel ? <ContextBadge label={contextLabel} /> : null}
    </div>
  );
}

function ContextBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-md bg-gold/20 px-2 py-1 text-[11px] font-black text-yellow-800 dark:text-gold">
      {label}
    </span>
  );
}

export function codesToStickers(codes: string[]): Sticker[] {
  return codes
    .map((code) => stickerByCode.get(code))
    .filter((sticker): sticker is Sticker => Boolean(sticker));
}
