/**
 * Focused verification for saved-friend / QR comparison data paths.
 * Run: npx tsx scripts/verify-friend-qr-flow.ts
 */
import {
  applyLiveTradeRecord,
  clearDeletionForFriend,
  dedupeFriends,
  filterRemovedFriends,
  findExistingFriend,
  friendNeedsLiveUpdate,
  normalizeSavedFriends,
  stripShareLinkedFriendSnapshotsForCloud
} from "../lib/savedFriends";
import {
  createEmptyCloudSnapshot,
  initialCloudSnapshotForNewAccount,
  mergeLocalAndCloud,
  resolveCloudSnapshotForLoad,
  snapshotForCloudUpload
} from "../lib/cloudSync";
import {
  LEGACY_COLLECTION_KEY,
  migrateLegacyCollectionToGuestScope,
  persistKeyForScope,
  resetCollectionPersistScopeForTests,
  setCollectionPersistScope
} from "../lib/collectionPersistScope";
import {
  mergeSignedInFriendsForStore,
  savedFriendRowToTradeFriend,
  stripShareLinkedFriendsFromCloudSettings
} from "../lib/savedFriendsDb";
import { hasUnsyncedLocalChanges, writeUserSyncMeta } from "../lib/syncMeta";
import { extractShareIdFromTradeInput, buildTradeProfilePayload, buildTradeQrLink, encodeTradeProfileForQr, getTradeMatch, buildSmartTradeProposal, parseTradeProfilePayload, pickSmartTradeProposal } from "../services/tradeQrService";
import { buildStableShareId } from "../lib/tradeShareService";
import { translate } from "../lib/i18n";
import type { TradeFriend } from "../types/sticker";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${label}`);
  } else {
    failed += 1;
    console.error(` FAIL ${label}`);
  }
}

/** Real album codes from data/stickers.json */
const CODE_MISSING = "FWC1";
const CODE_FRIEND_DUP = "FWC2";
const CODE_NEW_FRIEND_DUP = "FWC3";

function makeFriend(overrides: Partial<TradeFriend> = {}): TradeFriend {
  return {
    id: "friend-1",
    name: "User A",
    missing: [CODE_MISSING],
    duplicates: [CODE_FRIEND_DUP],
    shareId: "share-abc",
    importedAt: "2026-01-01T00:00:00.000Z",
    snapshotAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

console.log("\n=== Live friend data detection ===\n");

const base = makeFriend();
assert(
  friendNeedsLiveUpdate(base, {
    shareId: "share-abc",
    displayName: "User A",
    missing: [CODE_MISSING],
    duplicates: [CODE_FRIEND_DUP, CODE_NEW_FRIEND_DUP],
    updatedAt: "2026-06-03T12:00:00.000Z"
  }),
  "Friend adds duplicate → live update needed"
);

assert(
  friendNeedsLiveUpdate(base, {
    shareId: "share-abc",
    displayName: "User A",
    missing: [],
    duplicates: [CODE_FRIEND_DUP],
    updatedAt: "2026-06-03T12:00:00.000Z"
  }),
  "Friend marks missing as owned → live update needed"
);

assert(
  !friendNeedsLiveUpdate(base, {
    shareId: "share-abc",
    displayName: "User A",
    missing: [CODE_MISSING],
    duplicates: [CODE_FRIEND_DUP],
    updatedAt: "2026-06-03T12:00:00.000Z"
  }),
  "Same lists → no misleading live update"
);

console.log("\n=== Comparison recalculation (getTradeMatch) ===\n");

const myQtyBefore = { [CODE_MISSING]: 2, [CODE_FRIEND_DUP]: 0, [CODE_NEW_FRIEND_DUP]: 1 };
const matchBefore = getTradeMatch(myQtyBefore, base);
assert(matchBefore.iCanGive.includes(CODE_MISSING), "Before: I can give missing sticker I duplicate");
assert(matchBefore.friendCanGive.includes(CODE_FRIEND_DUP), "Before: friend can give their duplicate");

const friendAfterDup = applyLiveTradeRecord(base, {
  shareId: "share-abc",
  displayName: "User A",
  missing: [CODE_MISSING],
  duplicates: [CODE_FRIEND_DUP, CODE_NEW_FRIEND_DUP],
  updatedAt: "2026-06-03T12:00:00.000Z"
});
const matchAfterDup = getTradeMatch(myQtyBefore, friendAfterDup);
assert(
  !matchAfterDup.friendCanGive.includes(CODE_NEW_FRIEND_DUP),
  "New friend duplicate: no swap until I am missing that code"
);
assert(matchAfterDup.friendCanGive.includes(CODE_FRIEND_DUP), "Still can receive existing friend duplicate");

const myQtyAfter = { [CODE_MISSING]: 2, [CODE_FRIEND_DUP]: 0, [CODE_NEW_FRIEND_DUP]: 0 };
const matchAfterMyMissing = getTradeMatch(myQtyAfter, friendAfterDup);
assert(
  matchAfterMyMissing.friendCanGive.includes(CODE_NEW_FRIEND_DUP),
  "I change collection → can receive newly listed friend duplicate"
);

const friendAfterOwned = applyLiveTradeRecord(base, {
  shareId: "share-abc",
  displayName: "User A",
  missing: [],
  duplicates: [CODE_FRIEND_DUP],
  updatedAt: "2026-06-03T13:00:00.000Z"
});
const matchAfterOwned = getTradeMatch(myQtyBefore, friendAfterOwned);
assert(!matchAfterOwned.iCanGive.includes(CODE_MISSING), "Friend owned missing sticker → I no longer give it");
assert(matchAfterOwned.friendCanGive.includes(CODE_FRIEND_DUP), "Still can receive friend duplicate");

const possibleBefore =
  getTradeMatch(myQtyBefore, base).iCanGive.length + getTradeMatch(myQtyBefore, base).friendCanGive.length;
const possibleAfter =
  matchAfterOwned.iCanGive.length + matchAfterOwned.friendCanGive.length;
assert(possibleAfter !== possibleBefore, "Possible swap count changes when friend missing list shrinks");

console.log("\n=== Cloud friend merge prefers latest snapshot ===\n");

const staleCloudFriend = makeFriend({
  id: "friend-1",
  importedAt: "2026-06-04T12:00:00.000Z",
  snapshotAt: "2026-06-01T00:00:00.000Z",
  missing: [CODE_MISSING],
  duplicates: []
});
const freshLocalFriend = makeFriend({
  id: "friend-1",
  importedAt: "2026-01-01T00:00:00.000Z",
  snapshotAt: "2026-06-04T13:00:00.000Z",
  missing: [],
  duplicates: [CODE_FRIEND_DUP]
});
const mergedByTime = dedupeFriends([staleCloudFriend, freshLocalFriend]);
assert(
  mergedByTime.length === 1 &&
    mergedByTime[0]!.missing.length === 0 &&
    mergedByTime[0]!.duplicates.includes(CODE_FRIEND_DUP),
  "Newer snapshotAt wins over newer importedAt when deduping share-linked friends"
);

console.log("\n=== Removal persistence & dedupe ===\n");

const dupA = makeFriend({ id: "f1", shareId: "share-x" });
const dupB = makeFriend({ id: "f2", shareId: "share-x", snapshotAt: "2026-02-01T00:00:00.000Z" });
const deduped = dedupeFriends([dupA, dupB]);
assert(deduped.length === 1 && deduped[0]!.id === "f2", "Duplicate shareId collapsed to newer record");

const removed = filterRemovedFriends([makeFriend()], [], ["share-abc"]);
assert(removed.length === 0, "deletedShareIds blocks friend from list after refresh merge");

const normalized = normalizeSavedFriends(
  [dupA, dupB, makeFriend({ id: "f3", shareId: "share-y" })],
  ["f3"],
  []
);
assert(normalized.length === 1 && normalized[0]!.shareId === "share-x", "Normalize dedupes and respects deletedFriendIds");

const reimportBlocked = filterRemovedFriends(
  [makeFriend({ id: "new-id", shareId: "share-abc" })],
  [],
  ["share-abc"]
);
assert(reimportBlocked.length === 0, "Tombstoned shareId stays removed until explicit re-save clears tombstone");

function simulateUpsertAfterRemoval(incoming: Pick<TradeFriend, "name" | "missing" | "duplicates" | "shareId">) {
  const stateFriends: TradeFriend[] = [];
  const deletedShareIds = incoming.shareId ? [incoming.shareId] : [];
  const existing = findExistingFriend(stateFriends, incoming);
  const importedAt = new Date().toISOString();
  const nextFriend: TradeFriend = {
    ...incoming,
    id: existing?.id ?? "friend-reimport",
    shareId: incoming.shareId,
    snapshotAt: importedAt,
    importedAt
  };
  const cleared = clearDeletionForFriend([], deletedShareIds, nextFriend);
  const mergedFriends = existing
    ? stateFriends.map((item) => (item.id === nextFriend.id ? nextFriend : item))
    : [nextFriend, ...stateFriends];
  return normalizeSavedFriends(mergedFriends, cleared.deletedFriendIds, cleared.deletedShareIds);
}

const restored = simulateUpsertAfterRemoval({
  name: "Veljko Tonic",
  missing: [CODE_MISSING],
  duplicates: [CODE_FRIEND_DUP],
  shareId: "share-abc"
});
assert(restored.length === 1 && restored[0]!.name === "Veljko Tonic", "Re-import after removal restores friend");

console.log("\n=== QR URL parsing ===\n");

const parsedShare = extractShareIdFromTradeInput(
  "https://sticker-mate-beta.vercel.app/friend-qr?data=SMQR2:Test:2026-01-01T00:00:00.000Z:AAAA:BBBB&share=share-abc"
);
assert(parsedShare === "share-abc", "Pasted beta QR URL preserves share id");

const stableShareId = buildStableShareId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
assert(stableShareId.startsWith("s_"), "Signed-in users get deterministic stable share id");

console.log("\n=== Compact QR share id ===\n");

const compact = encodeTradeProfileForQr({
  ...buildTradeProfilePayload("User A", { [CODE_MISSING]: 1 }),
  generatedAt: "2026-01-01T00:00:00.000Z",
  shareId: stableShareId
});
assert(parseTradeProfilePayload(compact).shareId === stableShareId, "Compact payload embeds stable share id");
const compactLink = buildTradeQrLink(compact, "https://stickermate.app", stableShareId);
assert(parseTradeProfilePayload(compactLink).shareId === stableShareId, "Full QR link preserves stable share id");

console.log("\n=== Smart trade proposal ===\n");

const giveMany = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
const receiveFew = ["X", "Y", "Z"];
const balanced = pickSmartTradeProposal(giveMany, receiveFew);
assert(
  balanced?.give.length === 3 && balanced.receive.length === 3 && balanced.hasMore,
  "Proposal balances to smaller side and notes more swaps"
);

const tSr = (key: keyof typeof import("../locales/sr.json"), params?: Record<string, string | number>) =>
  translate("sr", key, params);
const proposal = buildSmartTradeProposal("Veljko", ["BIH9", "MAR18"], ["MEX3", "RSA5"], tSr);
assert(
  Boolean(proposal?.includes("Veljko") && proposal.includes("BIH9") && proposal.includes("MEX3")),
  "Proposal includes friend name and selected codes"
);
assert(buildSmartTradeProposal("Veljko", [], ["MEX3"], tSr) === null, "No proposal when I cannot give");

console.log("\n=== Phase 1 cloud persistence helpers ===\n");

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: () => null,
    get length() {
      return store.size;
    }
  } as Storage;
}

const shareFriend = makeFriend({ shareId: "share-live", missing: [CODE_MISSING], duplicates: [CODE_FRIEND_DUP] });
const stripped = stripShareLinkedFriendSnapshotsForCloud([shareFriend]);
assert(
  stripped[0]!.missing.length === 0 && stripped[0]!.duplicates.length === 0 && stripped[0]!.shareId === "share-live",
  "Share-linked friend trade lists stripped for cloud upload"
);

const guestFriend = makeFriend({ shareId: undefined, missing: [CODE_MISSING], duplicates: [] });
const strippedGuest = stripShareLinkedFriendSnapshotsForCloud([guestFriend]);
assert(strippedGuest[0]!.missing.includes(CODE_MISSING), "Guest friend without shareId keeps snapshot lists");

const cloudPayload = snapshotForCloudUpload({
  albumId: "fifa-world-cup-2026",
  quantities: {},
  settings: {
    theme: "system",
    language: "sr",
    viewMode: "list",
    defaultCurrency: "RSD",
    packPriceRsd: 0,
    stickersPerPack: 0,
    tradeDisplayName: "",
    friends: [shareFriend],
    deletedFriendIds: [],
    deletedShareIds: [],
    recentCodes: [],
    entryHistory: []
  },
  reviewState: { currentIndex: 0, completed: false },
  onboarded: false,
  dismissedGuides: {},
  tradeHistory: [],
  spendingEntries: [],
  updatedAt: "2026-01-01T00:00:00.000Z"
});
assert(
  cloudPayload.settings.friends.length === 0,
  "snapshotForCloudUpload omits share-linked friends from cloud settings"
);
assert(
  cloudPayload.settings.deletedShareIds?.length === 0 && cloudPayload.settings.deletedFriendIds.length === 0,
  "snapshotForCloudUpload clears friend tombstones (saved_friends owns relations)"
);

const localSnap = {
  albumId: "fifa-world-cup-2026",
  quantities: { [CODE_MISSING]: 2 },
  settings: {
    theme: "system" as const,
    language: "sr" as const,
    viewMode: "list" as const,
    defaultCurrency: "RSD" as const,
    packPriceRsd: 0,
    stickersPerPack: 0,
    tradeDisplayName: "",
    friends: [],
    deletedFriendIds: [],
    deletedShareIds: [],
    recentCodes: [],
    entryHistory: []
  },
  reviewState: { currentIndex: 0, completed: false },
  onboarded: false,
  dismissedGuides: {},
  tradeHistory: [],
  spendingEntries: [],
  updatedAt: "2026-06-04T12:00:00.000Z"
};
const cloudSnap = {
  ...localSnap,
  quantities: { [CODE_MISSING]: 1 },
  updatedAt: "2026-06-01T00:00:00.000Z"
};
const merged = mergeLocalAndCloud(localSnap, cloudSnap);
assert((merged.quantities[CODE_MISSING] ?? 0) === 2, "mergeLocalAndCloud keeps max quantity per sticker");

writeUserSyncMeta("user-test", { cloudUpdatedAt: "2026-01-01T00:00:00.000Z", syncedFingerprint: "fp-old" });
assert(hasUnsyncedLocalChanges("user-test", "fp-new"), "Unsynced when fingerprint differs from sync meta");
assert(
  resolveCloudSnapshotForLoad("user-test", cloudSnap, localSnap, "fp-new", false).quantities[CODE_MISSING] === 2,
  "Resolve merges when unsynced"
);
assert(
  resolveCloudSnapshotForLoad("user-test", cloudSnap, localSnap, "fp-new", true).quantities[CODE_MISSING] === 1,
  "preferCloud keeps cloud quantities on account switch/login"
);

const promoted = initialCloudSnapshotForNewAccount(localSnap);
assert((promoted.quantities[CODE_MISSING] ?? 0) === 2, "New account promotes meaningful local snapshot");
const emptyPromoted = initialCloudSnapshotForNewAccount(createEmptyCloudSnapshot());
assert(Object.keys(emptyPromoted.quantities).length === 0, "New account without data stays empty");

console.log("\n=== Phase 2 scoped localStorage ===\n");

resetCollectionPersistScopeForTests();
const guestId = "guest_test_1";
const userA = "user-a-id";
const userB = "user-b-id";
const guestKey = persistKeyForScope({ type: "guest", id: guestId });
const userAKey = persistKeyForScope({ type: "user", id: userA });
const userBKey = persistKeyForScope({ type: "user", id: userB });

globalThis.localStorage.clear();
globalThis.localStorage.setItem(
  LEGACY_COLLECTION_KEY,
  JSON.stringify({ state: { quantities: { [CODE_MISSING]: 5 }, friends: [] }, version: 0 })
);
migrateLegacyCollectionToGuestScope(guestId);
assert(Boolean(globalThis.localStorage.getItem(guestKey)?.includes(CODE_MISSING)), "Legacy global key migrates into guest scope only");
assert(!globalThis.localStorage.getItem(userAKey), "Legacy global key is not copied to user scope");

globalThis.localStorage.setItem(
  userAKey,
  JSON.stringify({ state: { quantities: { [CODE_FRIEND_DUP]: 3 }, friends: [] }, version: 0 })
);
globalThis.localStorage.setItem(
  userBKey,
  JSON.stringify({ state: { quantities: { [CODE_NEW_FRIEND_DUP]: 7 }, friends: [] }, version: 0 })
);
assert(
  globalThis.localStorage.getItem(userAKey) !== globalThis.localStorage.getItem(userBKey),
  "User A and User B scoped keys stay isolated"
);

setCollectionPersistScope({ type: "guest", id: guestId });
assert(persistKeyForScope({ type: "guest", id: guestId }) === guestKey, "Guest persist key uses stickermate-guest:{id}");
assert(persistKeyForScope({ type: "user", id: userA }) === userAKey, "User persist key uses stickermate-user:{id}");

console.log("\n=== Phase 3 saved_friends helpers ===\n");

const dbFriend = savedFriendRowToTradeFriend({
  id: "row-1",
  user_id: userA,
  album_id: "fifa-world-cup-2026",
  friend_share_id: "share-abc",
  local_friend_id: "friend-db-1",
  friend_display_name: "User A",
  notes: null,
  imported_at: "2026-01-01T00:00:00.000Z",
  last_fetched_at: "2026-06-03T12:00:00.000Z",
  last_snapshot_at: "2026-06-03T12:00:00.000Z",
  cached_missing_count: 1,
  cached_duplicate_count: 1,
  cached_possible_swaps_count: null,
  cached_snapshot: { missing: [CODE_MISSING], duplicates: [CODE_FRIEND_DUP] },
  deleted_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-06-03T12:00:00.000Z"
});
assert(dbFriend.shareId === "share-abc" && dbFriend.missing.includes(CODE_MISSING), "saved_friends row maps to TradeFriend with cached fallback");

const mergedFriends = mergeSignedInFriendsForStore(
  [makeFriend({ id: "db-1", shareId: "share-abc" }), makeFriend({ id: "db-2", shareId: "share-abc", name: "Dup" })],
  [makeFriend({ id: "local-1", shareId: undefined }), makeFriend({ id: "local-2", shareId: "share-xyz" })]
);
assert(mergedFriends.length === 2, "mergeSignedInFriendsForStore dedupes share-linked and keeps local-only");
assert(
  stripShareLinkedFriendsFromCloudSettings([makeFriend(), makeFriend({ shareId: undefined })]).length === 1,
  "stripShareLinkedFriendsFromCloudSettings removes share-linked legacy settings friends"
);

console.log("\n=== Trade profile reflects all quantity changes ===\n");

const ownedBefore = buildTradeProfilePayload("User A", { [CODE_MISSING]: 0 });
const ownedAfter = buildTradeProfilePayload("User A", { [CODE_MISSING]: 1 });
assert(ownedBefore.missing.includes(CODE_MISSING) && !ownedAfter.missing.includes(CODE_MISSING), "Friend owns sticker → missing list shrinks");

const dupBefore = buildTradeProfilePayload("User A", { [CODE_FRIEND_DUP]: 1 });
const dupAfter = buildTradeProfilePayload("User A", { [CODE_FRIEND_DUP]: 2 });
const dupRemoved = buildTradeProfilePayload("User A", { [CODE_FRIEND_DUP]: 1 });
assert(
  !dupBefore.duplicates.includes(CODE_FRIEND_DUP) &&
    dupAfter.duplicates.includes(CODE_FRIEND_DUP) &&
    !dupRemoved.duplicates.includes(CODE_FRIEND_DUP),
  "Duplicate add/remove updates published duplicate list"
);

const viewerQty = { [CODE_MISSING]: 2, [CODE_FRIEND_DUP]: 0, [CODE_NEW_FRIEND_DUP]: 0 };
const beforeMatch = getTradeMatch(viewerQty, {
  missing: ownedBefore.missing,
  duplicates: dupAfter.duplicates
});
const afterMissingMatch = getTradeMatch(viewerQty, {
  missing: ownedAfter.missing,
  duplicates: dupAfter.duplicates
});
assert(beforeMatch.iCanGive.includes(CODE_MISSING) && !afterMissingMatch.iCanGive.includes(CODE_MISSING), "Viewer trade match updates when friend missing list shrinks");

console.log("\n=== ConfirmDialog mobile layout (static) ===\n");

import { readFileSync } from "node:fs";

const dialog = readFileSync("components/ConfirmDialog.tsx", "utf8");
assert(dialog.includes("items-center"), "Modal uses viewport-centered flex alignment");
assert(dialog.includes("z-[60]"), "Modal stacks above bottom nav");
assert(dialog.includes("safe-area-inset"), "Modal uses safe-area padding");

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
