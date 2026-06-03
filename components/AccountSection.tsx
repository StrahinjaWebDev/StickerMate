"use client";

import { useEffect, useState } from "react";
import { Cloud, LogOut, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { Button, Card } from "@/components/ui/Primitives";
import { getGuestInitials, getProfileInfo } from "@/lib/accountProfile";
import { getGuestIdentity, type GuestIdentity } from "@/lib/guestProfiles";
import { resolveCloudMerge, runManualSync, signInWithGoogle, signOutLocally, useAuthSyncStore } from "@/lib/authSyncStore";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/lib/i18n";

const isDev = process.env.NODE_ENV === "development";

export function AccountSection() {
  const { language, t } = useI18n();
  const user = useAuthSyncStore((state) => state.user);
  const status = useAuthSyncStore((state) => state.status);
  const messageKey = useAuthSyncStore((state) => state.messageKey);
  const authMessageKey = useAuthSyncStore((state) => state.authMessageKey);
  const mergePrompt = useAuthSyncStore((state) => state.mergePrompt);
  const [authError, setAuthError] = useState(false);
  const [localMessageKey, setLocalMessageKey] = useState<TranslationKey | null>(null);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);

  const profileInfo = user ? getProfileInfo(user) : null;
  const backupUnavailable = status === "failed" || status === "disabled_missing_tables";
  const backupEnabled = Boolean(user) && !backupUnavailable && status !== "auth_expired";

  useEffect(() => {
    setGuestIdentity(getGuestIdentity());
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const authStatus = url.searchParams.get("auth");
    const hasAuthError = authStatus === "error" || hashParams.has("error");

    if (hasAuthError) {
      setAuthError(true);
      setLocalMessageKey(null);
    } else if (authStatus === "not-configured") {
      setLocalMessageKey("account.notConfigured");
    } else if (authStatus === "success") {
      setLocalMessageKey("account.authSuccess");
    }

    if (authStatus || hashParams.has("error")) {
      url.searchParams.delete("auth");
      url.hash = "";
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  async function handleGoogleSignIn() {
    setAuthError(false);
    setLocalMessageKey(null);
    await signInWithGoogle();
  }

  const guestName = guestIdentity?.name ?? (language === "sr" ? "Lokalni Kolekcionar" : "Local Collector");
  const visibleMessageKey = authMessageKey ?? messageKey ?? localMessageKey;

  return (
    <Card>
      <div className="space-y-4">
        <h2 className="text-lg font-black text-ink dark:text-white">{t("account.title")}</h2>

        {authError ? (
          <InlineNotice message={t("account.googleAuthFailed")} actionLabel={t("account.retryGoogle")} onAction={handleGoogleSignIn} />
        ) : null}

        {status === "auth_expired" ? (
          <InlineNotice message={t("account.sessionExpired")} actionLabel={t("account.signInGoogle")} onAction={handleGoogleSignIn} />
        ) : null}

        {!user ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
              <div className="flex min-w-0 items-center gap-3">
                <FallbackAvatar initials={getGuestInitials(guestName)} localOnly />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("account.guestMode")}</p>
                  {guestIdentity ? (
                    <p className="mt-0.5 truncate text-base font-black text-ink dark:text-white">{guestName}</p>
                  ) : null}
                  <p className="mt-1 text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">{t("account.guestBody")}</p>
                </div>
              </div>
            </div>

            <Button className="w-full" tone="primary" onClick={handleGoogleSignIn}>
              <Cloud size={18} />
              {t("account.signInForBackup")}
            </Button>
          </div>
        ) : profileInfo ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar avatarUrl={profileInfo.avatarUrl} initials={profileInfo.initials} alt={profileInfo.displayName ?? profileInfo.email} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("account.signedInAs")}</p>
                  {profileInfo.displayName ? (
                    <p className="mt-0.5 truncate text-base font-black text-ink dark:text-white">{profileInfo.displayName}</p>
                  ) : null}
                  <p className={clsx("break-words text-sm font-bold text-neutral-600 dark:text-neutral-300", profileInfo.displayName && "mt-1")}>
                    {profileInfo.email}
                  </p>
                  {backupEnabled ? (
                    <p className="mt-2 inline-flex rounded-md bg-pitch/10 px-2 py-1 text-xs font-black text-pitch">
                      {t("account.onlineBackupEnabled")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {mergePrompt ? (
              <div className="rounded-lg border border-pitch/20 bg-pitch/10 p-3 dark:border-pitch/30 dark:bg-pitch/15">
                <p className="text-sm font-black text-ink dark:text-white">
                  {mergePrompt.reason === "cloud-empty" ? t("account.saveOnlineTitle") : t("account.mergeTitle")}
                </p>
                {mergePrompt.reason === "cloud-empty" ? null : (
                  <p className="mt-1 text-sm font-semibold leading-5 text-neutral-700 dark:text-neutral-300">{t("account.mergeBody")}</p>
                )}
                <div className="mt-3 grid gap-2">
                  {mergePrompt.reason === "cloud-empty" ? (
                    <Button tone="primary" disabled={status === "syncing"} onClick={() => resolveCloudMerge("local")}>
                      {t("account.saveOnlineTitle")}
                    </Button>
                  ) : (
                    <>
                      <Button tone="primary" disabled={status === "syncing"} onClick={() => resolveCloudMerge("cloud")}>
                        {t("account.mergeCloud")}
                      </Button>
                      <Button disabled={status === "syncing"} onClick={() => resolveCloudMerge("local")}>
                        {t("account.mergeLocal")}
                      </Button>
                      <Button disabled={status === "syncing"} onClick={() => resolveCloudMerge("merge")}>
                        {t("account.mergeBoth")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {backupUnavailable ? (
              <p className="text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">{t("account.backupUnavailable")}</p>
            ) : null}

            <Button className="w-full" tone="danger" onClick={signOutLocally}>
              <LogOut size={18} />
              {t("account.signOut")}
            </Button>

            {isDev ? (
              <Button className="w-full" onClick={runManualSync} disabled={status === "syncing" || Boolean(mergePrompt)}>
                <RefreshCw size={18} />
                Dev sync
              </Button>
            ) : null}
          </div>
        ) : null}

        {visibleMessageKey &&
        visibleMessageKey !== "account.loadingOnline" &&
        status !== "auth_expired" &&
        !authError ? (
          <p className="rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
            {t(visibleMessageKey as TranslationKey)}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function ProfileAvatar({
  avatarUrl,
  initials,
  alt
}: {
  avatarUrl: string | null;
  initials: string;
  alt: string;
}) {
  return (
    <span
      className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-pitch text-sm font-black text-white shadow-sm ring-2 ring-white dark:ring-neutral-900"
      aria-label={alt}
      role="img"
    >
      <span className="relative z-0">{initials}</span>
      {avatarUrl ? (
        <span
          className="absolute inset-0 z-10 bg-cover bg-center"
          style={{ backgroundImage: `url("${avatarUrl}")` }}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}

function FallbackAvatar({ initials, localOnly = false }: { initials: string; localOnly?: boolean }) {
  return (
    <span
      className={clsx(
        "grid h-14 w-14 shrink-0 place-items-center rounded-full text-base font-black shadow-sm ring-2 ring-white dark:ring-neutral-900",
        localOnly ? "bg-gold/20 text-yellow-800 dark:text-gold" : "bg-pitch text-white"
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function InlineNotice({
  message,
  actionLabel,
  onAction
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm font-semibold leading-6 text-coral dark:border-coral/40 dark:bg-coral/15">
      <p>{message}</p>
      <Button className="mt-3 w-full sm:w-auto" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
