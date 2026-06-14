/**
 * Verifies WhatsApp full messages and manual trade validation/quantity rules.
 */
import { buildManualTradeProposalMessage, validateManualTradeInput } from "../lib/manualTrade";
import {
  buildMessagePreview,
  buildTradesWhatsAppMessage,
  isMessagePreviewShortened
} from "../lib/tradeMessages";
import { stickerByCode, stickers } from "../lib/stickers";
import { buildFriendTradeMessage } from "../services/tradeQrService";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${label}`);
  }
}

const t = (key: string, params?: Record<string, string | number>) => {
  if (key === "trades.messageMissing") return `MISSING:\n${params?.missing ?? ""}`;
  if (key === "trades.messageDuplicates") return `DUP:\n${params?.duplicates ?? ""}`;
  if (key === "trades.manualProposalMessage") {
    return `PROPOSAL:\n${params?.give ?? ""}\n${params?.need ?? ""}`;
  }
  if (key === "friendDetail.tradeMessage") {
    return `FRIEND:\n${params?.give ?? ""}\n${params?.need ?? ""}`;
  }
  return `BOTH:\n${params?.missing ?? ""}\n${params?.duplicates ?? ""}`;
};

function applyTradeQuantities(
  quantities: Record<string, number>,
  stickersGiven: string[],
  stickersReceived: string[],
  allowAlbumGive = false
) {
  const next = { ...quantities };
  for (const code of stickersGiven) {
    const quantity = next[code] ?? 0;
    next[code] = allowAlbumGive ? Math.max(0, quantity - 1) : quantity > 1 ? quantity - 1 : quantity;
  }
  for (const code of stickersReceived) {
    next[code] = (next[code] ?? 0) + 1;
  }
  return next;
}

function assertFullMessage(message: string, lastCode: string, label: string) {
  assert(!message.includes("…"), `${label}: no ellipsis character`);
  assert(!message.includes("..."), `${label}: no triple-dot truncation`);
  assert(message.includes(lastCode), `${label}: includes last code ${lastCode}`);
}

function testWhatsAppSizes() {
  const sizes = [5, 50, 150];
  for (const size of sizes) {
    const missingCodes = stickers.slice(0, size).map((sticker) => sticker.code);
    const full = buildTradesWhatsAppMessage({
      messageType: "missing",
      missingCodes,
      duplicateLines: [],
      t
    });
    assertFullMessage(full, missingCodes[missingCodes.length - 1], `missing x${size}`);

    const preview = buildMessagePreview(full, false);
    if (size <= 5) {
      assert(!isMessagePreviewShortened(full, preview), `missing x${size}: short list preview equals full`);
    } else {
      assert(isMessagePreviewShortened(full, preview), `missing x${size}: long list preview is shortened`);
      assert(buildMessagePreview(full, true) === full, `missing x${size}: expanded preview equals full`);
    }
  }

  const duplicateLines = stickers.slice(0, 50).map((sticker) => `${sticker.code} x2`);
  const dupMessage = buildTradesWhatsAppMessage({
    messageType: "duplicates",
    missingCodes: [],
    duplicateLines,
    t
  });
  assertFullMessage(dupMessage, duplicateLines[duplicateLines.length - 1], "duplicates x50");

  const bothDuplicates = stickers.slice(30, 60).map((sticker) => `${sticker.code} x2`);
  const bothMessage = buildTradesWhatsAppMessage({
    messageType: "both",
    missingCodes: stickers.slice(0, 30).map((sticker) => sticker.code),
    duplicateLines: bothDuplicates,
    t
  });
  assertFullMessage(bothMessage, bothDuplicates[bothDuplicates.length - 1], "both tab uses full sections");
}

console.log("WhatsApp full messages (5/50/150)");
testWhatsAppSizes();

console.log("Friend comparison message");
{
  const give = stickers.slice(0, 80).map((sticker) => sticker.code);
  const need = stickers.slice(80, 140).map((sticker) => sticker.code);
  const message = buildFriendTradeMessage("Friend", give, need, t);
  assertFullMessage(message, need[need.length - 1], "friend trade message");
  const preview = buildMessagePreview(message, false);
  assert(isMessagePreviewShortened(message, preview), "friend message preview shortened for UI");
}

console.log("Manual trade proposal message");
{
  const proposal = buildManualTradeProposalMessage(["BIH9", "MAR18", "USA6"], ["MEX3", "RSA5", "KOR1"], t);
  assert(proposal.includes("BIH9"), "proposal includes all give codes");
  assert(proposal.includes("KOR1"), "proposal includes all need codes");
  assert(!proposal.includes("…"), "proposal has no ellipsis");
  assert(!proposal.includes("..."), "proposal has no triple-dot truncation");

  const longGive = stickers.slice(0, 40).map((sticker) => sticker.code);
  const longNeed = stickers.slice(40, 90).map((sticker) => sticker.code);
  const longProposal = buildManualTradeProposalMessage(longGive, longNeed, t);
  assertFullMessage(longProposal, longNeed[longNeed.length - 1], "long manual proposal");
}

console.log("Manual trade validation");
{
  const base = { MEX1: 2, MEX2: 1, BRA14: 0, MEX3: 0 };
  const validB = validateManualTradeInput("MEX1", "BRA14", base);
  assert(validB.invalidGiven.length === 0 && validB.invalidReceived.length === 0, "B: valid codes");
  assert(validB.given.join(",") === "MEX1", "B: parsed give");
  assert(validB.received.join(",") === "BRA14", "B: parsed receive");

  const afterB = applyTradeQuantities(base, validB.given, validB.received);
  assert(afterB.MEX1 === 1 && afterB.BRA14 === 1, "B: quantities after trade");

  const beforeSave = { ...base };
  validateManualTradeInput("MEX1", "BRA14", base);
  assert(JSON.stringify(base) === JSON.stringify(beforeSave), "validation alone does not change quantities");

  const validC = validateManualTradeInput("", "MEX3 MEX3", base);
  assert(validC.received.filter((c) => c === "MEX3").length === 2, "C: repeated receive preserved");
  const afterC = applyTradeQuantities(base, [], validC.received);
  assert(afterC.MEX3 === 2, "C: MEX3 +2");

  const validD = validateManualTradeInput("MEX1 MEX1", "", { MEX1: 3 });
  assert(validD.given.filter((c) => c === "MEX1").length === 2, "D: repeated give preserved");
  const afterD = applyTradeQuantities({ MEX1: 3 }, validD.given, []);
  assert(afterD.MEX1 === 1, "D: MEX1 3 -> 1");

  const invalidE = validateManualTradeInput("ABC999", "", base);
  assert(invalidE.invalidGiven.includes("ABC999"), "E: invalid code detected");

  const albumF = validateManualTradeInput("MEX2", "", { MEX2: 1 });
  assert(albumF.albumCopyWarnings.includes("MEX2"), "F: single-copy warning");
  assert(albumF.insufficientGiven.length === 0, "F: not insufficient when qty matches give");

  const blockedF = applyTradeQuantities({ MEX2: 1 }, ["MEX2"], [], false);
  assert(blockedF.MEX2 === 1, "F: blocked give keeps only album copy");

  const allowedF = applyTradeQuantities({ MEX2: 1 }, ["MEX2"], [], true);
  assert(allowedF.MEX2 === 0, "F: confirmed album give removes copy");

  const zeroGive = validateManualTradeInput("BRA14", "MEX1", { BRA14: 0, MEX1: 1 });
  assert(zeroGive.insufficientGiven.some((item) => item.code === "BRA14"), "give qty 0 is rejected");
}

console.log("Code parsing formats");
{
  const mixed = validateManualTradeInput("MEX1, MEX2\nBRA14", "BRA14", { MEX1: 2, MEX2: 2, BRA14: 0 });
  assert(mixed.given[0] === "MEX1" && mixed.given[1] === "MEX2" && mixed.given[2] === "BRA14", "mixed separators parsed");
  assert(mixed.given.length === 3, "mixed separators count");

  const lowercase = validateManualTradeInput("bih9, mar18 USA6", "mex3\nrsa5", { BIH9: 2, MAR18: 2, USA6: 1, MEX3: 0, RSA5: 0 });
  assert(lowercase.given.join(",") === "BIH9,MAR18,USA6", "lowercase give codes normalized");
  assert(lowercase.received.join(",") === "MEX3,RSA5", "lowercase receive codes normalized");
  assert(stickerByCode.has("MEX1"), "sanity: known sticker");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
