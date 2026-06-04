import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const siteUrl = env.NEXT_PUBLIC_SITE_URL;

if (!url || !key) {
  console.error("FAIL: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  process.exit(1);
}

console.log("OK  .env.local loaded from project root");
console.log(`OK  NEXT_PUBLIC_SUPABASE_URL set (${url.length} chars)`);
console.log(`OK  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY set (${key.length} chars)`);
console.log(`OK  NEXT_PUBLIC_SITE_URL=${siteUrl ?? "(unset)"}`);
console.log(`OK  Supabase project ref: ${url.match(/https:\/\/([^.]+)/)?.[1] ?? "unknown"}`);

const supabase = createClient(url, key);

void (async () => {
  const { error: tradeError } = await supabase.from("trade_shares").select("share_id").limit(1);
  if (tradeError) {
    console.error(`FAIL trade_shares query: ${tradeError.message}`);
    console.error("Hint: re-run supabase/migrations/002_trade_shares.sql in THIS project's SQL Editor.");
    process.exit(1);
  }
  console.log("OK  trade_shares table reachable (anon read)");

  const { error: collectionsError } = await supabase.from("collections").select("user_id").limit(1);
  if (collectionsError) {
    console.error(`FAIL collections query: ${collectionsError.message}`);
    process.exit(1);
  }
  console.log("OK  collections table reachable");

  const { error: savedFriendsError } = await supabase.from("saved_friends").select("friend_share_id").limit(1);
  if (savedFriendsError) {
    console.error(`FAIL saved_friends query: ${savedFriendsError.message}`);
    console.error("Hint: re-run supabase/migrations/003_saved_friends.sql in THIS project's SQL Editor.");
    process.exit(1);
  }
  console.log("OK  saved_friends table reachable");

  console.log("\nSupabase env check passed. Start dev server and test Google OAuth in browser.");
})();
