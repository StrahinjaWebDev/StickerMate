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

export function AccountSection() {
  const { language, t } = useI18n();
  const user = useAuthSyncStore((state) => state.user);
  const status = useAuthSyncStore((state) => state.status);
  const messageKey = useAuthSyncStore((state) => state.messageKey);
  const authMessageKey = useAuthSyncStore((state) => state.authMessageKey);
  const lastSyncedAt = useAuthSyncStore((state) => state.lastSyncedAt);
  const mergePrompt = useAuthSyncStore((state) => state.mergePrompt);
  const [authError, setAuthError] = useState(false);
  const [localMessageKey, setLocalMessageKey] = useState<TranslationKey | null>(null);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);

  const profileInfo = user ? getProfileInfo(user) : null;

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
  const statusLabel =
    status === "syncing"
      ? t("account.syncing")
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
  const statusTone =
    status === "synced" ? "success" : status === "syncing" ? "syncing" : status === "failed" || status === "auth_expired" ? "failed" : status === "disabled_missing_tables" ? "warning" : "neutral";
  const visibleMessageKey = authMessageKey ?? messageKey ?? localMessageKey;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-ink dark:text-white">{t("account.title")}</h2>
          <StatusPill label={statusLabel} tone={statusTone} />
        </div>

        {authError ? (
          <AccountWarning tone="danger" message={t("account.googleAuthFailed")} actionLabel={t("account.retryGoogle")} onAction={handleGoogleSignIn} />
        ) : null}

        {status === "auth_expired" ? (
          <AccountWarning tone="danger" message={t("account.sessionExpired")} actionLabel={t("account.signInGoogle")} onAction={handleGoogleSignIn} />
        ) : null}

        {!user ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
              <div className="flex min-w-0 items-center gap-3">
                <FallbackAvatar initials={getGuestInitials(guestName)} localOnly />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("account.guestMode")}</p>
                  <p className="mt-0.5 truncate text-base font-black text-ink dark:text-white">{guestName}</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                    {t("account.guestBody")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-line p-3 dark:border-white/10">
              <p className="text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                {t("account.guestGooglePrompt")}
              </p>
              <Button className="mt-3 w-full" tone="primary" onClick={handleGoogleSignIn}>
                <Cloud size={18} />
                {t("account.signInGoogle")}
              </Button>
            </div>
          </div>
        ) : profileInfo ? (
          <div className="space-y-4">
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
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <InfoRow label={t("account.cloudSaveStatus")} value={statusLabel} />
                <InfoRow label={t("account.lastSynced")} value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "-"} />
              </div>
            </div>

            {mergePrompt ? (
              <div className="rounded-lg border border-pitch/20 bg-pitch/10 p-3 dark:border-pitch/30 dark:bg-pitch/15">
                <p className="text-sm font-black text-ink dark:text-white">
                  {mergePrompt.reason === "cloud-empty" ? t("account.cloudEmptyTitle") : t("account.mergeTitle")}
                </p>
                <p className="mt-1 text-sm font-semibold leading-5 text-neutral-700 dark:text-neutral-300">
                  {mergePrompt.reason === "cloud-empty" ? t("account.cloudEmptyBody") : t("account.mergeBody")}
                </p>
                <div className="mt-3 grid gap-2">
                  <Button tone="primary" disabled={status === "syncing"} onClick={() => resolveCloudMerge("local")}>
                    {t("account.mergeLocal")}
                  </Button>
                  {mergePrompt.cloud ? (
                    <>
                      <Button disabled={status === "syncing"} onClick={() => resolveCloudMerge("cloud")}>{t("account.mergeCloud")}</Button>
                      <Button disabled={status === "syncing"} onClick={() => resolveCloudMerge("merge")}>{t("account.mergeBoth")}</Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {status === "disabled_missing_tables" ? (
              <AccountWarning tone="warning" message={t("account.cloudNotReady")} actionLabel={t("account.retrySync")} onAction={runManualSync} />
            ) : null}

            {status === "failed" ? (
              <AccountWarning tone="danger" message={t("account.syncWarning")} actionLabel={t("account.retrySync")} onAction={runManualSync} />
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                tone="primary"
                onClick={runManualSync}
                disabled={status === "syncing" || Boolean(mergePrompt) || status === "disabled_missing_tables"}
              >
                <RefreshCw size={18} />
                {status === "syncing" ? t("account.syncing") : t("account.syncNow")}
              </Button>
              <Button tone="danger" onClick={signOutLocally}>
                <LogOut size={18} />
                {t("account.signOut")}
              </Button>
            </div>
          </div>
        ) : null}

        {visibleMessageKey && status !== "disabled_missing_tables" && status !== "failed" && status !== "auth_expired" ? (
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

function StatusPill({
  label,
  tone
}: {
  label: string;
  tone: "neutral" | "success" | "syncing" | "warning" | "failed";
}) {
  return (
    <span
      className={clsx(
        "shrink-0 rounded-md px-2.5 py-1 text-xs font-black",
        tone === "neutral" && "bg-field text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300",
        tone === "success" && "bg-pitch/10 text-pitch",
        tone === "syncing" && "bg-gold/15 text-yellow-800 dark:text-gold",
        tone === "warning" && "bg-gold/15 text-yellow-800 dark:text-gold",
        tone === "failed" && "bg-coral/10 text-coral"
      )}
    >
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 dark:bg-neutral-900">
      <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-ink dark:text-white">{value}</p>
    </div>
  );
}

function AccountWarning({
  tone,
  message,
  actionLabel,
  onAction
}: {
  tone: "warning" | "danger";
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-lg border p-3 text-sm font-semibold leading-6",
        tone === "warning" && "border-gold/40 bg-gold/15 text-yellow-800 dark:text-gold",
        tone === "danger" && "border-coral/25 bg-coral/10 text-coral dark:border-coral/40 dark:bg-coral/15"
      )}
    >
      <p>{message}</p>
      <Button className="mt-3 w-full sm:w-auto" onClick={onAction}>
        <RefreshCw size={18} />
        {actionLabel}
      </Button>
    </div>
  );
}
