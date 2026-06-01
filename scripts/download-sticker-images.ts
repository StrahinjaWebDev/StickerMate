import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Checklist = {
  stickers: Array<{
    code: string;
    name: string;
    team: string;
  }>;
};

type ReportEntry = {
  code: string;
  status: "downloaded" | "skipped" | "failed";
  url: string;
  file: string;
  error?: string;
};

const root = process.cwd();
const checklistPath = path.join(root, "data", "stickers.json");
const outputDir = path.join(root, "public", "stickers");
const reportPath = path.join(root, "scripts", "sticker-image-download-report.json");
const manifestPath = path.join(outputDir, "manifest.json");
const imageBaseUrl = "https://www.laststicker.com/i/cards/12176";
const delayMs = 175;

async function main() {
  const checklist = JSON.parse(await readFile(checklistPath, "utf8")) as Checklist;
  await mkdir(outputDir, { recursive: true });

  const report: ReportEntry[] = [];
  const localImages = new Set<string>();
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, sticker] of checklist.stickers.entries()) {
    const imageCode = sticker.code.toLowerCase();
    const url = `${imageBaseUrl}/${imageCode}.jpg`;
    const file = path.join(outputDir, `${imageCode}.jpg`);

    if (existsSync(file)) {
      skipped += 1;
      localImages.add(imageCode);
      report.push({ code: sticker.code, status: "skipped", url, file });
      printProgress(index + 1, checklist.stickers.length, downloaded, skipped, failed);
      continue;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("image")) throw new Error(`Unexpected content type: ${contentType || "unknown"}`);

      const bytes = Buffer.from(await response.arrayBuffer());
      await writeFile(file, bytes);
      localImages.add(imageCode);
      downloaded += 1;
      report.push({ code: sticker.code, status: "downloaded", url, file });
    } catch (error) {
      failed += 1;
      report.push({
        code: sticker.code,
        status: "failed",
        url,
        file,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    printProgress(index + 1, checklist.stickers.length, downloaded, skipped, failed);
    await wait(delayMs);
  }

  await writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totals: { downloaded, skipped, failed },
        entries: report
      },
      null,
      2
    )
  );
  await writeFile(manifestPath, JSON.stringify(Array.from(localImages).sort(), null, 2));

  console.log(`\nDone. Report written to ${reportPath}`);
  console.log(`Local image manifest written to ${manifestPath}`);
}

function printProgress(done: number, total: number, downloaded: number, skipped: number, failed: number) {
  process.stdout.write(
    `\r${done}/${total} processed | downloaded: ${downloaded} | skipped: ${skipped} | failed: ${failed}`
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
