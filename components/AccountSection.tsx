"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cloud, LogOut, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Button, Card } from "@/components/ui/Primitives";
import {
  getCloudSyncFailureKind,
  getCurrentUser,
  getLocalSnapshot,
  hasMeaningfulLocalData,
  loadCloudCollection,
  mergeLocalAndCloud,
  saveCloudCollection,
  saveLocalSnapshot,
  subscribeToAuthChanges,
  syncNow,
  type CloudSnapshot,
  type CloudSyncStatus
} from "@/lib/cloudSync";
import { getGuestIdentity, type GuestIdentity } from "@/lib/guestProfiles";
import { useI18n } from "@/hooks/useI18n";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { createClient } from "@/utils/supabase/client";

type MergePrompt = {
  cloud: CloudSnapshot | null;
  reason: "cloud-empty" | "both-have-data";
};

type ProfileInfo = {
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  initials: string;
};

function getMetadataString(user: User, key: "full_name" | "name" | "avatar_url" | "picture") {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getInitials(name: string | null, email: string) {
  const source = name ?? email;
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || "U").toUpperCase();
}

function getSafeAvatarUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function getProfileInfo(user: User): ProfileInfo {
  const email = user.email ?? "";
  const displayName = getMetadataString(user, "full_name") ?? getMetadataString(user, "name");
  const avatarUrl = getSafeAvatarUrl(getMetadataString(user, "avatar_url") ?? getMetadataString(user, "picture"));

  return {
    displayName,
    email,
    avatarUrl,
    initials: getInitials(displayName, email)
  };
}

function getGuestInitials(name: string) {
  return getInitials(name, "guest");
}

export function AccountSection() {
  const { language, t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<CloudSyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [mergePrompt, setMergePrompt] = useState<MergePrompt | null>(null);
  const [authError, setAuthError] = useState(false);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);
  const syncInFlightRef = useRef(false);
  const preparedUserIdRef = useRef<string | null>(null);

  const profileInfo = user ? getProfileInfo(user) : null;

  const setSyncFailure = useCallback(
    (error: unknown) => {
      const failureKind = getCloudSyncFailureKind(error);
      if (failureKind === "missing_tables") {
        setStatus("disabled_missing_tables");
        setMessage(t("account.cloudNotReady"));
        return;
      }

      setStatus("failed");
      setMessage(t("account.syncWarning"));
    },
    [t]
  );

  const runBackgroundSync = useCallback(
    async (client: SupabaseClient, currentUser: User) => {
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      setStatus("syncing");
      try {
        await saveCloudCollection(client, currentUser, getLocalSnapshot());
        setLastSyncedAt(new Date().toISOString());
        setStatus("synced");
        setMessage(null);
      } catch (error) {
        setSyncFailure(error);
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [setSyncFailure]
  );

  const prepareCloudState = useCallback(async (client: SupabaseClient, currentUser: User, force = false) => {
    if (syncInFlightRef.current) return;
    if (!force && preparedUserIdRef.current === currentUser.id) return;
    syncInFlightRef.current = true;
    preparedUserIdRef.current = currentUser.id;
    setStatus("syncing");
    try {
      const local = getLocalSnapshot();
      const cloud = await loadCloudCollection(client, currentUser.id);
      const localHasData = hasMeaningfulLocalData(local);
      const cloudHasData = cloud ? hasMeaningfulLocalData(cloud) : false;

      if (!cloud && localHasData) {
        setMergePrompt({ cloud: null, reason: "cloud-empty" });
        setStatus("idle");
        return;
      }

      if (cloud && localHasData && cloudHasData) {
        setMergePrompt({ cloud, reason: "both-have-data" });
        setStatus("idle");
        return;
      }

      if (cloud && cloudHasData && !localHasData) {
        saveLocalSnapshot(cloud);
        setLastSyncedAt(cloud.updatedAt);
      }

      setStatus("synced");
      setMessage(null);
    } catch (error) {
      setSyncFailure(error);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [setSyncFailure]);

  useEffect(() => {
    setGuestIdentity(getGuestIdentity());
  }, []);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const currentUser = await getCurrentUser(supabase);
      if (!active) return;
      setUser(currentUser);
      if (currentUser && supabase) await prepareCloudState(supabase, currentUser);
    }

    loadUser();
    const unsubscribe = subscribeToAuthChanges(supabase, (nextUser) => {
      setUser(nextUser);
      setMessage(null);
      if (nextUser && supabase) void prepareCloudState(supabase, nextUser);
      else {
        setMergePrompt(null);
        setStatus("idle");
        preparedUserIdRef.current = null;
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [prepareCloudState, supabase]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const authStatus = url.searchParams.get("auth");
    const hasAuthError = authStatus === "error" || hashParams.has("error");

    if (hasAuthError) {
      setAuthError(true);
    } else if (authStatus === "not-configured") {
      setMessage(t("account.notConfigured"));
    } else if (authStatus === "success") {
      setMessage(t("account.authSuccess"));
    }

    if (authStatus || hashParams.has("error")) {
      url.searchParams.delete("auth");
      url.hash = "";
      window.history.replaceState(null, "", url.toString());
    }
  }, [t]);

  useEffect(() => {
    if (!supabase || !user || mergePrompt || status === "disabled_missing_tables" || status === "failed" || status === "syncing") {
      return;
    }

    let syncTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useCollectionStore.subscribe(() => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        void runBackgroundSync(supabase, user);
      }, 1500);
    });

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
      unsubscribe();
    };
  }, [mergePrompt, runBackgroundSync, status, supabase, user]);

  async function signInWithGoogle() {
    setAuthError(false);
    setMessage(null);

    if (!supabase) {
      setStatus("failed");
      setMessage(t("account.notConfigured"));
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setMergePrompt(null);
    setLastSyncedAt(null);
    setMessage(null);
    setStatus("idle");
    preparedUserIdRef.current = null;
  }

  async function handleSyncNow() {
    if (!supabase || !user) return;
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setStatus("syncing");
    try {
      const snapshot = await syncNow(supabase, user);
      setLastSyncedAt(snapshot.updatedAt);
      setStatus("synced");
      setMessage(t("account.syncSuccess"));
    } catch (error) {
      setSyncFailure(error);
    } finally {
      syncInFlightRef.current = false;
    }
  }

  async function resolveMerge(action: "local" | "cloud" | "merge") {
    if (!supabase || !user || !mergePrompt) return;
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setStatus("syncing");
    try {
      const local = getLocalSnapshot();
      const nextSnapshot =
        action === "cloud" && mergePrompt.cloud
          ? mergePrompt.cloud
          : action === "merge" && mergePrompt.cloud
            ? mergeLocalAndCloud(local, mergePrompt.cloud)
            : local;

      saveLocalSnapshot(nextSnapshot);
      await saveCloudCollection(supabase, user, nextSnapshot);
      setMergePrompt(null);
      setLastSyncedAt(new Date().toISOString());
      setStatus("synced");
      setMessage(t("account.syncSuccess"));
    } catch (error) {
      setSyncFailure(error);
    } finally {
      syncInFlightRef.current = false;
    }
  }

  const guestName = guestIdentity?.name ?? (language === "sr" ? "Lokalni Kolekcionar" : "Local Collector");
  const statusLabel =
    status === "syncing"
      ? t("account.syncing")
      : status === "synced"
        ? t("account.savedOnline")
        : status === "disabled_missing_tables"
          ? t("account.cloudStatusNotReady")
          : status === "failed"
            ? t("account.cloudStatusFailed")
            : user
              ? t("account.cloudStatusIdle")
              : t("account.localOnly");
  const statusTone =
    status === "synced" ? "success" : status === "syncing" ? "syncing" : status === "failed" ? "failed" : status === "disabled_missing_tables" ? "warning" : "neutral";

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-ink dark:text-white">{t("account.title")}</h2>
          <StatusPill label={statusLabel} tone={statusTone} />
        </div>

        {authError ? (
          <div
            role="alert"
            className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm font-bold text-coral dark:border-coral/40 dark:bg-coral/15"
          >
            <p>{t("account.googleAuthFailed")}</p>
            <Button className="mt-3 w-full sm:w-auto" tone="primary" onClick={signInWithGoogle}>
              <Cloud size={18} />
              {t("account.retryGoogle")}
            </Button>
          </div>
        ) : null}

        {!user ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
              <div className="flex min-w-0 items-center gap-3">
                <FallbackAvatar initials={getGuestInitials(guestName)} localOnly />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("account.guestMode")}</p>
                  <p className="mt-0.5 truncate text-base font-black text-ink dark:text-white">
                    {t("account.localProfile")}
                  </p>
                  <p className="mt-0.5 truncate text-base font-black text-ink dark:text-white">{guestName}</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                    {t("account.guestBody")}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-neutral-600 dark:text-neutral-400">
                    {t("account.guestGooglePrompt")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-line p-3 dark:border-white/10">
              <Button className="mt-3 w-full" tone="primary" onClick={signInWithGoogle}>
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
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <InfoRow label={t("account.cloudSaveStatus")} value={statusLabel} />
                <InfoRow label={t("account.lastSynced")} value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "-"} />
              </div>
            </div>

            {mergePrompt ? (
              <div className="rounded-lg border border-pitch/20 bg-pitch/10 p-3 dark:border-pitch/30 dark:bg-pitch/15">
                <p className="text-sm font-black text-ink dark:text-white">
                  {mergePrompt.reason === "cloud-empty" ? t("account.cloudEmptyTitle") : t("account.mergeTitle")}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-neutral-700 dark:text-neutral-300">
                  {mergePrompt.reason === "cloud-empty" ? t("account.cloudEmptyBody") : t("account.mergeBody")}
                </p>
                <div className="mt-3 grid gap-2">
                <Button tone="primary" onClick={() => resolveMerge("local")}>
                  {t("account.mergeLocal")}
                </Button>
                  {mergePrompt.cloud ? (
                    <>
                      <Button onClick={() => resolveMerge("cloud")}>{t("account.mergeCloud")}</Button>
                      <Button onClick={() => resolveMerge("merge")}>{t("account.mergeBoth")}</Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {status === "disabled_missing_tables" ? (
              <AccountWarning tone="warning" message={t("account.cloudNotReady")} actionLabel={t("account.retrySync")} onAction={handleSyncNow} />
            ) : null}

            {status === "failed" ? (
              <AccountWarning tone="danger" message={t("account.syncWarning")} actionLabel={t("account.retrySync")} onAction={handleSyncNow} />
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                tone="primary"
                onClick={handleSyncNow}
                disabled={status === "syncing" || Boolean(mergePrompt) || status === "disabled_missing_tables"}
              >
                <RefreshCw size={18} />
                {status === "syncing" ? t("account.syncing") : t("account.syncNow")}
              </Button>
              <Button tone="danger" onClick={signOut}>
                <LogOut size={18} />
                {t("account.signOut")}
              </Button>
            </div>
          </div>
        ) : null}

        {message && status !== "disabled_missing_tables" && status !== "failed" ? (
          <p className="rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
            {message}
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
