"use client";

import Link from "next/link";
import { Camera, HelpCircle, QrCode, Settings, UserPlus, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";

const moreItems = [
  { href: "/scan", labelKey: "scan.title" as const, icon: Camera },
  { href: "/spending", labelKey: "spending.title" as const, icon: Wallet },
  { href: "/trade-qr", labelKey: "tradeQr.title" as const, icon: QrCode },
  { href: "/friend-qr", labelKey: "friendQr.title" as const, icon: UserPlus },
  { href: "/help", labelKey: "help.title" as const, icon: HelpCircle },
  { href: "/settings", labelKey: "settings.title" as const, icon: Settings }
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
              className="flex min-h-24 items-center gap-3 rounded-lg border border-line bg-white p-4 font-black text-ink shadow-sm transition hover:bg-field dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
                <Icon size={21} />
              </span>
              {t(item.labelKey)}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
