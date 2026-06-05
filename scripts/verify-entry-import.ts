/**
 * Verifies Novi unos import counting and result-preview constants.
 */
import { readFileSync } from "node:fs";
import { IMPORT_PREVIEW_LIMIT } from "../features/stickers/ImportPreview";
import { getDuplicateCount } from "../lib/stickers";
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

type SimulatedSummary = {
  imported: number;
  duplicates: number;
  invalid: number;
  newCodes: string[];
  duplicateCodes: string[];
  invalidCodes: string[];
};

function simulateImport(codes: string[], startingQuantities: Record<string, number> = {}): {
  summary: SimulatedSummary;
  quantities: Record<string, number>;
} {
  const seen = new Set<string>();
  const newCodes = new Set<string>();
  const duplicateCodes = new Set<string>();
  const invalidCodes: string[] = [];
  const quantities = { ...startingQuantities };
  let imported = 0;
  let invalid = 0;
  let duplicates = 0;

  for (const code of codes) {
    const token = code.toUpperCase();
    if (!stickerByCode.has(token)) {
      invalid += 1;
      invalidCodes.push(token);
      continue;
    }
    imported += 1;
    const previousQuantity = quantities[token] ?? 0;
    if (previousQuantity === 0 && !seen.has(token)) newCodes.add(token);
    if (seen.has(token) || previousQuantity > 0) {
      duplicates += 1;
      duplicateCodes.add(token);
    }
    seen.add(token);
    quantities[token] = previousQuantity + 1;
  }

  return {
    summary: {
      imported,
      duplicates,
      invalid,
      newCodes: Array.from(newCodes),
      duplicateCodes: Array.from(duplicateCodes),
      invalidCodes
    },
    quantities
  };
}

function firstStickerCode() {
  return stickerByCode.keys().next().value as string;
}

function secondStickerCode() {
  const codes = Array.from(stickerByCode.keys());
  return codes[1] ?? codes[0]!;
}

console.log("\n=== Novi unos import summary ===\n");

const codeA = firstStickerCode();
const codeB = secondStickerCode();

const small = simulateImport([codeA, codeB, codeB]);
assert(small.summary.imported === 3, "Small input: 3 processed");
assert(small.summary.newCodes.length === 2, "Small input: 2 new stickers");
assert(small.summary.duplicates === 1, "Small input: 1 duplicate occurrence");
assert(getDuplicateCount(small.quantities, codeB) === 1, "Small input: duplicate qty = quantity - 1");

const mediumCodes = Array.from({ length: 10 }, (_, index) =>
  index % 2 === 0 ? codeA : codeB
);
const medium = simulateImport(mediumCodes);
assert(medium.summary.imported === 10, "Medium input: 10 processed");
assert(medium.summary.newCodes.length === 2, "Medium input: 2 unique new stickers");

const largeCodes = Array.from(stickerByCode.keys()).slice(0, 25);
const large = simulateImport(largeCodes);
assert(large.summary.imported === 25, "Large input: 25 processed");
assert(large.summary.newCodes.length === 25, "Large input: 25 unique new stickers");
assert(
  large.summary.newCodes.length > IMPORT_PREVIEW_LIMIT,
  "Large input: new sticker count exceeds preview limit"
);

const mixed = simulateImport([codeA, codeB, codeB, "NOTREAL123", codeA]);
assert(mixed.summary.imported === 4, "Mixed input: valid codes saved");
assert(mixed.summary.invalid === 1, "Mixed input: 1 invalid code");
assert(mixed.summary.duplicates === 2, "Mixed input: duplicate occurrences counted");

const repeat = simulateImport([codeA], { [codeA]: 1 });
assert(repeat.summary.duplicates === 1, "Repeat on owned sticker counts as duplicate");
assert(getDuplicateCount(repeat.quantities, codeA) === 1, "Repeat increases duplicate count correctly");

console.log("\n=== Import preview UI constants ===\n");

assert(IMPORT_PREVIEW_LIMIT === 8, "Preview limit is 8 stickers");

const previewSource = readFileSync("features/stickers/ImportPreview.tsx", "utf8");
assert(previewSource.includes("import.processedTotal"), "Summary uses Ukupno obrađeno label key");
assert(previewSource.includes("import.allSavedHint"), "Summary explains preview is not full save list");
assert(previewSource.includes('t("import.viewAll")'), "Expand button uses Pogledaj sve");
assert(previewSource.includes("entry.saved"), "Result card shows Unos je sačuvan heading");

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
