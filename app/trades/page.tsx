"use client";

import Link from "next/link";
import { Handshake, QrCode, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { GuideCard } from "@/components/GuideCard";
import { Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function TradesPage() {
  const { t } = useI18n();
  const friends = useCollectionStore((state) => state.friends);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("trades.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {t("trades.body")}
        </p>
      </section>

      <GuideCard guide="trades" titleKey="guide.tradesTitle" bodyKey="guide.tradesBody" />

      <Card>
        <h2 className="text-xl font-black text-ink dark:text-white">{t("trades.shortcuts")}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <ToolLink href="/trade-qr" label={t("trades.myQr")} icon={<QrCode size={19} />} />
          <ToolLink href="/friend-qr" label={t("trades.scanFriend")} icon={<UserPlus size={19} />} />
        </div>
      </Card>

      {friends.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {friends.map((friend) => (
            <Card key={friend.id}>
              <h2 className="text-lg font-black text-ink dark:text-white">{friend.name}</h2>
              <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                {t("tradeQr.missingCount", { count: friend.missing.length })} · {t("tradeQr.duplicateCount", { count: friend.duplicates.length })}
              </p>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState
          icon={Handshake}
          title={t("trades.emptyTitle")}
          body={t("trades.emptyBody")}
        />
      )}
    </div>
  );
}

function ToolLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 font-black text-ink shadow-sm transition hover:bg-field dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800"
    >
      {icon}
      {label}
    </Link>
  );
}
