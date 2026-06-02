"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cloud, LogOut, RefreshCw, UserCircle } from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Button, Card } from "@/components/ui/Primitives";
import {
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
import { useI18n } from "@/hooks/useI18n";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { createClient } from "@/utils/supabase/client";

type MergePrompt = {
  cloud: CloudSnapshot | null;
  reason: "cloud-empty" | "both-have-data";
};

export function AccountSection() {
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<CloudSyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [mergePrompt, setMergePrompt] = useState<MergePrompt | null>(null);

  const runBackgroundSync = useCallback(
    async (client: SupabaseClient, currentUser: User) => {
      try {
        await saveCloudCollection(client, currentUser, getLocalSnapshot());
        setLastSyncedAt(new Date().toISOString());
        setStatus("success");
        setMessage(null);
      } catch {
        setStatus("warning");
        setMessage(t("account.syncWarning"));
      }
    },
    [t]
  );

  const prepareCloudState = useCallback(async (client: SupabaseClient, currentUser: User) => {
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

      setStatus("success");
    } catch {
      setStatus("warning");
      setMessage(t("account.syncWarning"));
    }
  }, [t]);

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
      else setMergePrompt(null);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [prepareCloudState, supabase]);

  useEffect(() => {
    if (!supabase || !user || mergePrompt) return;

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
  }, [mergePrompt, runBackgroundSync, supabase, user]);

  async function signInWithGoogle() {
    if (!supabase) {
      setStatus("warning");
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
  }

  async function handleSyncNow() {
    if (!supabase || !user) return;
    setStatus("syncing");
    try {
      const snapshot = await syncNow(supabase, user);
      setLastSyncedAt(snapshot.updatedAt);
      setStatus("success");
      setMessage(t("account.syncSuccess"));
    } catch {
      setStatus("warning");
      setMessage(t("account.syncWarning"));
    }
  }

  async function resolveMerge(action: "local" | "cloud" | "merge") {
    if (!supabase || !user || !mergePrompt) return;
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
      setStatus("success");
      setMessage(t("account.syncSuccess"));
    } catch {
      setStatus("warning");
      setMessage(t("account.syncWarning"));
    }
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pitch text-white">
          <UserCircle size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-ink dark:text-white">{t("account.title")}</h2>
          {!user ? (
            <div className="mt-2 space-y-3">
              <div>
                <p className="text-sm font-black text-ink dark:text-white">{t("account.guestMode")}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
                  {t("account.guestBody")}
                </p>
                <p className="text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
                  {t("account.guestRisk")}
                </p>
              </div>
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

              <div className="grid gap-2 sm:grid-cols-2">
                <Button tone="primary" onClick={handleSyncNow} disabled={status === "syncing" || Boolean(mergePrompt)}>
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
          {message ? (
            <p className="mt-3 rounded-lg bg-field p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
