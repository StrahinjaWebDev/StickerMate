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
  normalizeSavedFriends
} from "../lib/savedFriends";
import { extractShareIdFromTradeInput, buildTradeProfilePayload, getTradeMatch, buildSmartTradeProposal, pickSmartTradeProposal } from "../services/tradeQrService";
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
