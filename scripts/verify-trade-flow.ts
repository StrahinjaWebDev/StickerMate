/**
 * Verifies WhatsApp full messages and manual trade validation/quantity rules.
 */
import { buildManualTradeProposalMessage, validateManualTradeInput } from "../lib/manualTrade";
import { buildTradesWhatsAppMessage, buildTradesWhatsAppPreview } from "../lib/tradeMessages";
import { stickerByCode } from "../lib/stickers";

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

console.log("WhatsApp full message");
{
  const missingCodes = Array.from({ length: 60 }, (_, index) => `CZE${index + 1}`);
  const full = buildTradesWhatsAppMessage({
    messageType: "missing",
    missingCodes,
    duplicateLines: [],
    t
  });
  assert(!full.includes("…"), "full message has no ellipsis character");
  assert(!full.includes("..."), "full message has no triple-dot truncation");
  assert(full.includes("CZE60"), "full message includes last missing code");

  const preview = buildTradesWhatsAppPreview(full, false);
  assert(preview !== full, "preview is shorter than full message for long text");
  assert(buildTradesWhatsAppPreview(full, true) === full, "expanded preview equals full message");
}

console.log("Manual trade proposal message");
{
  const proposal = buildManualTradeProposalMessage(["BIH9", "MAR18", "USA6"], ["MEX3", "RSA5", "KOR1"], t);
  assert(proposal.includes("BIH9"), "proposal includes all give codes");
  assert(proposal.includes("KOR1"), "proposal includes all need codes");
  assert(!proposal.includes("…"), "proposal has no ellipsis");
  assert(!proposal.includes("..."), "proposal has no triple-dot truncation");
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
}

console.log("Code parsing formats");
{
  const mixed = validateManualTradeInput("MEX1, MEX2\nBRA14", "BRA14", { MEX1: 2, MEX2: 2, BRA14: 0 });
  assert(mixed.given[0] === "MEX1" && mixed.given[1] === "MEX2" && mixed.given[2] === "BRA14", "mixed separators parsed");
  assert(mixed.given.length === 3, "mixed separators count");
  assert(stickerByCode.has("MEX1"), "sanity: known sticker");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
