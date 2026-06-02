"use client";

import { createBrowserClient } from "@supabase/ssr/dist/module/createBrowserClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/utils/supabase/config";

let browserClient: SupabaseClient | null = null;

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();
  if (!url || !publishableKey) return null;

  browserClient ??= createBrowserClient(url, publishableKey);
  return browserClient;
}
