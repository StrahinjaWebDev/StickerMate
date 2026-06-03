"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Handshake, Home, Layers3, MoreHorizontal, Sticker } from "lucide-react";
import { clsx } from "clsx";
import { AccountStatusPrompt } from "@/components/AccountStatusPrompt";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GuestProfileHydrator } from "@/components/GuestProfileHydrator";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { useI18n } from "@/hooks/useI18n";

const navItems = [
  { href: "/", labelKey: "nav.home" as const, icon: Home },
  { href: "/collection", labelKey: "nav.collection" as const, icon: Sticker },
  { href: "/fill", labelKey: "nav.fill" as const, icon: Layers3 },
  { href: "/trades", labelKey: "nav.trades" as const, icon: Handshake },
  { href: "/more", labelKey: "nav.more" as const, icon: MoreHorizontal }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/fill") return pathname === "/fill" || pathname === "/review";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 pb-24 pt-3 sm:px-5 lg:pb-8">
      <header className="sticky top-0 z-30 -mx-3 border-b border-line/70 bg-field/90 px-3 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/90 sm:-mx-5 sm:px-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="StickerMate">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white shadow-lift">
              <BarChart3 size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black leading-tight text-ink dark:text-white">StickerMate</span>
              <span className="hidden text-sm text-neutral-600 dark:text-neutral-400 sm:block">
                {t("app.subtitle")}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <AccountStatusPrompt variant="chip" />
            <nav className="hidden items-center gap-1 rounded-lg border border-line bg-white p-1 shadow-sm dark:border-white/10 dark:bg-neutral-900 lg:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition active:scale-[0.98]",
                      active
                        ? "bg-pitch text-white"
                        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    )}
                  >
                    <Icon size={18} />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 py-4 sm:py-6">{children}</main>
      <GuestProfileHydrator />
      <ServiceWorkerRegister />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => {
                  if (active) {
                    event.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={clsx(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-bold transition active:scale-95",
                  active
                    ? "bg-pitch text-white"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
                )}
              >
                <Icon size={20} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
