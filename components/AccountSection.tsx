"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cloud, LogOut, Pencil, Plus, RefreshCw, Trash2, UserCircle, Users } from "lucide-react";
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
import {
  createGuestProfile,
  deleteGuestProfile,
  formatGuestProfileName,
  getGuestProfilesState,
  loadGuestProfile,
  renameGuestProfile,
  type GuestProfilesState
} from "@/lib/guestProfiles";
import { useI18n } from "@/hooks/useI18n";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { createClient } from "@/utils/supabase/client";

type MergePrompt = {
  cloud: CloudSnapshot | null;
  reason: "cloud-empty" | "both-have-data";
};

export function AccountSection() {
  const { language, t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<CloudSyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [mergePrompt, setMergePrompt] = useState<MergePrompt | null>(null);
  const [authError, setAuthError] = useState(false);
  const [guestState, setGuestState] = useState<GuestProfilesState | null>(null);
  const syncInFlightRef = useRef(false);
  const preparedUserIdRef = useRef<string | null>(null);

  const activeGuest = guestState?.profiles.find((profile) => profile.id === guestState.activeId);

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
    setGuestState(getGuestProfilesState(language));
  }, [language]);

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

  function handleSwitchGuest(profileId: string) {
    setGuestState(loadGuestProfile(profileId, language));
  }

  function handleAddGuest() {
    setGuestState(createGuestProfile(language));
  }

  function handleRenameGuest() {
    if (!activeGuest) return;
    const nextName = window.prompt(t("account.renameGuestPrompt"), formatGuestProfileName(activeGuest.name, language));
    if (!nextName) return;
    setGuestState(renameGuestProfile(activeGuest.id, nextName, language));
  }

  function handleDeleteGuest() {
    if (!activeGuest) return;
    if (!window.confirm(t("account.deleteGuestConfirm", { name: formatGuestProfileName(activeGuest.name, language) }))) {
      return;
    }
    setGuestState(deleteGuestProfile(activeGuest.id, language));
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white">
          <UserCircle size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-ink dark:text-white">{t("account.title")}</h2>
          {authError ? (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm font-bold text-coral dark:border-coral/40 dark:bg-coral/15"
            >
              <p>{t("account.googleAuthFailed")}</p>
              <Button className="mt-3 w-full sm:w-auto" tone="primary" onClick={signInWithGoogle}>
                <Cloud size={18} />
                {t("account.retryGoogle")}
              </Button>
            </div>
          ) : null}
          {!user ? (
            <div className="mt-2 space-y-3">
              <div>
                <p className="text-sm font-black text-ink dark:text-white">{t("account.guestMode")}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
                  {t("account.guestSignedOut")}
                </p>
                <p className="text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
                  {t("account.guestRisk")}
                </p>
              </div>
              {guestState && activeGuest ? (
                <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-pitch shadow-sm dark:bg-neutral-900">
                      <Users size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">
                        {t("account.switchGuest")}
                      </p>
                      <p className="mt-1 break-words text-sm font-black text-ink dark:text-white">
                        {formatGuestProfileName(activeGuest.name, language)}
                      </p>
                    </div>
                  </div>
                  {guestState.profiles.length > 1 ? (
                    <label className="mt-3 block">
                      <span className="sr-only">{t("account.switchGuest")}</span>
                      <select
                        value={guestState.activeId}
                        onChange={(event) => handleSwitchGuest(event.target.value)}
                        className="w-full rounded-lg border-line bg-white text-sm font-bold text-ink shadow-sm focus:border-pitch focus:ring-pitch dark:border-white/10 dark:bg-neutral-900 dark:text-white"
                      >
                        {guestState.profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {formatGuestProfileName(profile.name, language)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <Button onClick={handleAddGuest}>
                      <Plus size={18} />
                      {t("account.addGuest")}
                    </Button>
                    <Button onClick={handleRenameGuest}>
                      <Pencil size={18} />
                      {t("account.renameGuest")}
                    </Button>
                    <Button tone="danger" onClick={handleDeleteGuest} disabled={guestState.profiles.length <= 1}>
                      <Trash2 size={18} />
                      {t("account.deleteGuest")}
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button tone="primary" onClick={signInWithGoogle}>
                  <Cloud size={18} />
                  {t("account.signInGoogle")}
                </Button>
                <Button onClick={signInWithGoogle}>
                  <Cloud size={18} />
                  {t("account.saveOnline")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="rounded-lg bg-field p-3 dark:bg-neutral-950">
                <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{t("account.signedInAs")}</p>
                <p className="mt-1 break-words text-sm font-black text-ink dark:text-white">{user.email}</p>
                <p className="mt-2 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  {t("account.lastSynced")}: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "-"}
                </p>
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
                <div
                  role="alert"
                  className="rounded-lg border border-gold/40 bg-gold/15 p-3 text-sm font-bold text-yellow-800 dark:text-gold"
                >
                  <p>{t("account.cloudNotReady")}</p>
                  <Button className="mt-3 w-full sm:w-auto" onClick={handleSyncNow}>
                    <RefreshCw size={18} />
                    {t("account.retrySync")}
                  </Button>
                </div>
              ) : null}

              {status === "failed" ? (
                <div
                  role="alert"
                  className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm font-bold text-coral dark:border-coral/40 dark:bg-coral/15"
                >
                  <p>{t("account.syncWarning")}</p>
                  <Button className="mt-3 w-full sm:w-auto" onClick={handleSyncNow}>
                    <RefreshCw size={18} />
                    {t("account.retrySync")}
                  </Button>
                </div>
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
                <Button onClick={signOut}>
                  <LogOut size={18} />
                  {t("account.signOut")}
                </Button>
              </div>
            </div>
          )}
          {message && status !== "disabled_missing_tables" && status !== "failed" ? (
            <p className="mt-3 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
