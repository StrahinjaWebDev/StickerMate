"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cloud, UserCircle } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Primitives";
import { getGuestInitials, getProfileInfo } from "@/lib/accountProfile";
import { signInWithGoogle, useAuthSyncStore } from "@/lib/authSyncStore";
import { getGuestIdentity, type GuestIdentity } from "@/lib/guestProfiles";
import { useI18n } from "@/hooks/useI18n";

type AccountStatusPromptProps = {
  variant?: "banner" | "chip";
  className?: string;
};

export function AccountStatusPrompt({ variant = "banner", className }: AccountStatusPromptProps) {
  const { t } = useI18n();
  const user = useAuthSyncStore((state) => state.user);
  const status = useAuthSyncStore((state) => state.status);
  const mergePrompt = useAuthSyncStore((state) => state.mergePrompt);
  const profileInfo = user ? getProfileInfo(user) : null;
  const displayName = profileInfo?.displayName ?? profileInfo?.email ?? "";
  const backupUnavailable = status === "failed" || status === "disabled_missing_tables";
  const migrationPending = Boolean(mergePrompt);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);

  useEffect(() => {
    setGuestIdentity(getGuestIdentity());
  }, []);

  if (variant === "chip") {
    if (!user) {
      return (
        <button
          type="button"
          onClick={signInWithGoogle}
          aria-label={t("account.signInForBackup")}
          className={clsx(
            "hidden h-10 min-w-0 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:inline-flex",
            className
          )}
        >
          <Cloud size={17} />
          <span className="hidden md:inline">{t("account.signInForBackup")}</span>
        </button>
      );
    }

    return (
      <Link
        href="/more"
        className={clsx(
          "hidden h-10 min-w-0 items-center gap-2 rounded-lg border border-line bg-white px-2 text-sm font-black text-ink shadow-sm transition hover:bg-field active:scale-[0.98] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 sm:inline-flex",
          className
        )}
      >
        <MiniAvatar avatarUrl={profileInfo?.avatarUrl ?? null} initials={profileInfo?.initials ?? "U"} />
        <span className="hidden max-w-32 truncate xl:inline">{displayName}</span>
      </Link>
    );
  }

  if (!user) {
    const guestName = guestIdentity?.name ?? t("account.localProfile");

    return (
      <div
        className={clsx(
          "flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:flex-row sm:items-center sm:p-4",
          className
        )}
      >
        <Link
          href="/more"
          className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-90 active:scale-[0.99]"
          aria-label={t("account.openAccount")}
        >
          <MiniAvatar avatarUrl={null} initials={getGuestInitials(guestName)} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-black text-ink dark:text-white">{guestName}</span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {t("account.localOnly")}
            </span>
          </span>
          <UserCircle className="shrink-0 text-pitch sm:hidden" size={21} />
        </Link>
        <Button className="w-full shrink-0 px-3 text-sm sm:w-auto" tone="neutral" onClick={signInWithGoogle}>
          <Cloud size={17} />
          {t("account.signInGoogle")}
        </Button>
      </div>
    );
  }

  return (
    <Link
      href="/more"
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
          {migrationPending
            ? t("account.migrationPendingBanner")
            : backupUnavailable
              ? t("account.backupUnavailable")
              : t("account.onlineBackupEnabled")}
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
