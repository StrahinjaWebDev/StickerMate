"use client";

import Link from "next/link";
import { Cloud, UserCircle } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Primitives";
import { getProfileInfo } from "@/lib/accountProfile";
import { signInWithGoogle, useAuthSyncStore } from "@/lib/authSyncStore";
import { useI18n } from "@/hooks/useI18n";

type AccountStatusPromptProps = {
  variant?: "banner" | "chip";
  className?: string;
};

export function AccountStatusPrompt({ variant = "banner", className }: AccountStatusPromptProps) {
  const { t } = useI18n();
  const user = useAuthSyncStore((state) => state.user);
  const status = useAuthSyncStore((state) => state.status);
  const messageKey = useAuthSyncStore((state) => state.messageKey);
  const mergePrompt = useAuthSyncStore((state) => state.mergePrompt);

  const statusLabel =
    status === "syncing"
      ? messageKey === "account.loadingOnline"
        ? t("account.loadingOnline")
        : t("account.syncing")
      : status === "dirty"
        ? t("account.waitingToSync")
      : status === "synced"
        ? t("account.savedOnline")
        : status === "auth_expired"
          ? t("account.sessionExpired")
        : status === "disabled_missing_tables"
          ? t("account.cloudStatusFailed")
          : status === "failed"
            ? t("account.cloudStatusFailed")
            : status === "idle"
              ? user
                ? mergePrompt
                  ? t("account.chooseSync")
                  : t("account.savedOnline")
                : t("account.localOnly")
              : user
                ? t("account.savedOnline")
                : t("account.localOnly");
  const profileInfo = user ? getProfileInfo(user) : null;
  const displayName = profileInfo?.displayName ?? profileInfo?.email ?? "";

  if (variant === "chip") {
    if (!user) {
      return (
        <button
          type="button"
          onClick={signInWithGoogle}
          aria-label={t("account.saveOnline")}
          className={clsx(
            "hidden h-10 min-w-0 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:inline-flex",
            className
          )}
        >
          <Cloud size={17} />
          <span className="hidden md:inline">{t("account.saveOnline")}</span>
        </button>
      );
    }

    return (
      <Link
        href="/settings"
        className={clsx(
          "hidden h-10 min-w-0 items-center gap-2 rounded-lg border border-line bg-white px-2 text-sm font-black text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:inline-flex",
          className
        )}
      >
        <MiniAvatar avatarUrl={profileInfo?.avatarUrl ?? null} initials={profileInfo?.initials ?? "U"} />
        <span className="hidden max-w-28 truncate xl:inline">{displayName}</span>
        <span className="max-w-32 truncate text-xs text-neutral-500 dark:text-neutral-400">{statusLabel}</span>
      </Link>
    );
  }

  if (!user) {
    return (
      <section
        className={clsx(
          "rounded-lg border border-pitch/20 bg-pitch/10 p-3 shadow-sm dark:border-pitch/30 dark:bg-pitch/15 sm:p-4",
          className
        )}
        aria-label={t("account.saveOnline")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white">
              <Cloud size={20} />
            </span>
            <div className="min-w-0">
              <p className="font-black text-ink dark:text-white">{t("account.saveOnline")}</p>
              <p className="mt-0.5 text-sm font-semibold leading-5 text-neutral-700 dark:text-neutral-300">
                {t("account.localDataShort")}
              </p>
            </div>
          </div>
          <Button className="w-full shrink-0 px-3 text-sm sm:w-auto" tone="primary" onClick={signInWithGoogle}>
            <Cloud size={17} />
            {t("account.signInGoogle")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <Link
      href="/settings"
      className={clsx(
        "flex min-w-0 items-center gap-3 rounded-lg border border-line bg-white p-3 text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:p-4",
        className
      )}
      aria-label={t("account.title")}
    >
      <MiniAvatar avatarUrl={profileInfo?.avatarUrl ?? null} initials={profileInfo?.initials ?? "U"} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-black">{t("account.signedInCompact", { name: displayName })}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          {statusLabel} · {t("account.openAccount")}
        </span>
      </span>
      <UserCircle className="shrink-0 text-pitch" size={21} />
    </Link>
  );
}

function MiniAvatar({
  avatarUrl,
  initials,
  size = "sm"
}: {
  avatarUrl: string | null;
  initials: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={clsx(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-pitch text-xs font-black text-white",
        size === "lg" ? "h-11 w-11" : "h-7 w-7"
      )}
      aria-hidden="true"
    >
      <span className="relative z-0">{initials}</span>
      {avatarUrl ? (
        <span className="absolute inset-0 z-10 bg-cover bg-center" style={{ backgroundImage: `url("${avatarUrl}")` }} />
      ) : null}
    </span>
  );
}
