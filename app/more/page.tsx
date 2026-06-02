"use client";

import Link from "next/link";
import { ChevronRight, Copy, HelpCircle, QrCode, Settings, Shield, UserPlus, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";

const moreItems = [
  { href: "/teams", labelKey: "teams.title" as const, bodyKey: "teams.bodyShort" as const, icon: Shield },
  { href: "/duplicates", labelKey: "duplicates.title" as const, bodyKey: "duplicates.body" as const, icon: Copy },
  { href: "/spending", labelKey: "spending.title" as const, bodyKey: "spending.bodyShort" as const, icon: Wallet },
  { href: "/trade-qr", labelKey: "tradeQr.title" as const, bodyKey: "tradeQr.bodyShort" as const, icon: QrCode },
  { href: "/friend-qr", labelKey: "friendQr.title" as const, bodyKey: "friendQr.bodyShort" as const, icon: UserPlus },
  { href: "/help", labelKey: "help.title" as const, bodyKey: "help.bodyShort" as const, icon: HelpCircle },
  { href: "/settings", labelKey: "settings.title" as const, bodyKey: "settings.bodyShort" as const, icon: Settings }
];

export default function MorePage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="shadow-lift">
        <h1 className="text-3xl font-black text-ink dark:text-white">{t("more.title")}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
          {t("more.body")}
        </p>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2">
        {moreItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-24 items-center gap-3 rounded-lg border border-line bg-white p-4 text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
                <Icon size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-black">{t(item.labelKey)}</span>
                <span className="mt-1 block text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                  {t(item.bodyKey)}
                </span>
              </span>
              <ChevronRight className="shrink-0 text-neutral-400" size={19} />
            </Link>
          );
        })}
      </section>
    </div>
  );
}
