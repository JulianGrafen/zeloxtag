/**
 * Manual extraction test against real TÜV scan images.
 * Usage: npx tsx scripts/test-tuev-extraction.ts
 */

import fs from "node:fs";
import path from "node:path";

// Load env files before anything else — no dotenv dependency needed.
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const stripped = line.replace(/\s*#.*$/, "").trim();
    const m = stripped.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
    if (!m) continue;
    const val = m[2]!.replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}
loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

import { tuevExtractionService } from "../src/services/ocr/TuevExtractionService";

// ─── Ground truth ──────────────────────────────────────────────────────────────

const CASES = [
  {
    label: "IMG_6976 — TÜV Rheinland / FSP",
    file: "/Users/julian/Downloads/IMG_6976.jpg",
    expected: {
      mileageKm: 294683,
      testDate: "2026-01-26",
      result: "major_defects",
      preis: 171.9,
      defectCheckpoints: ["1.1.13a", "1.1.14a", "5.3.1b", "5.3.1d", "D5.2.3a"],
    },
  },
  {
    label: "IMG_6975 — DEKRA",
    file: "/Users/julian/Downloads/IMG_6975.jpg",
    expected: {
      mileageKm: 178605,
      testDate: "2021-03-23",
      result: "major_defects",
      preis: 125.0,
      defectCheckpoints: ["2.6b", "2.6d", "5.2.3d", "D5.2.3c"],
    },
  },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ok(label: string) {
  return `  ✅  ${label}`;
}

function fail(label: string, got: unknown, expected: unknown) {
  return `  ❌  ${label}\n       got:      ${JSON.stringify(got)}\n       expected: ${JSON.stringify(expected)}`;
}

function normalizeCheckpoint(s: string): string {
  return s.trim().toUpperCase();
}

function scoreCheckpoints(
  got: string[] | null | undefined,
  expected: readonly string[],
): { matched: string[]; missed: string[]; extra: string[] } {
  const gotNorm = new Set((got ?? []).map(normalizeCheckpoint));
  const expNorm = new Set(expected.map(normalizeCheckpoint));

  const matched = [...expNorm].filter((c) => gotNorm.has(c));
  const missed = [...expNorm].filter((c) => !gotNorm.has(c));
  const extra = [...gotNorm].filter((c) => !expNorm.has(c));
  return { matched, missed, extra };
}

// ─── Test runner ───────────────────────────────────────────────────────────────

async function runCase(caseData: (typeof CASES)[number]) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📄  ${caseData.label}`);
  console.log("═".repeat(60));

  const bytes = fs.readFileSync(caseData.file);
  const contentType = "image/jpeg";

  console.log("\n🔍  Running extractFromDocument (full page)…");
  const start = Date.now();
  const result = await tuevExtractionService.extractFromDocument({
    bytes,
    contentType,
  });
  const elapsed = Date.now() - start;
  console.log(`    Done in ${elapsed}ms\n`);

  const { report, amount } = result;
  const exp = caseData.expected;
  const lines: string[] = [];

  // KM-Stand
  lines.push(
    report.mileageKm === exp.mileageKm
      ? ok(`KM-Stand: ${report.mileageKm}`)
      : fail("KM-Stand", report.mileageKm, exp.mileageKm),
  );

  // Datum
  lines.push(
    report.testDate === exp.testDate
      ? ok(`Datum: ${report.testDate}`)
      : fail("Datum", report.testDate, exp.testDate),
  );

  // Ergebnis
  lines.push(
    report.result === exp.result
      ? ok(`Ergebnis: ${report.result}`)
      : fail("Ergebnis", report.result, exp.result),
  );

  // Preis
  const priceClose =
    amount !== null && Math.abs(amount - exp.preis) < 0.05;
  lines.push(
    priceClose
      ? ok(`Preis: ${amount} €`)
      : fail("Preis", amount, exp.preis),
  );

  // Mängel
  const extractedCheckpoints = [
    ...(report.defectsTable ?? []).map((r) => r.checkpoint ?? ""),
    ...(report.defectsList ?? []).map((s) => {
      const m = s.match(/^([A-Z0-9.]+[a-z]?)/);
      return m?.[1] ?? "";
    }),
  ].filter(Boolean);
  const unique = [...new Set(extractedCheckpoints.map(normalizeCheckpoint))];
  const score = scoreCheckpoints(unique, exp.defectCheckpoints);

  if (score.missed.length === 0 && score.extra.length === 0) {
    lines.push(ok(`Mängel: ${unique.join(", ")}`));
  } else {
    lines.push(
      fail(
        `Mängel (${score.matched.length}/${exp.defectCheckpoints.length} korrekt)`,
        `matched=[${score.matched.join(",")}] extra=[${score.extra.join(",")}]`,
        `missed=[${score.missed.join(",")}]`,
      ),
    );
  }

  for (const line of lines) console.log(line);

  // Raw output for debugging
  console.log("\n📦  Raw report:");
  console.log(JSON.stringify(report, null, 2));
  console.log("\n💰  amount:", amount, "  vendor:", result.vendor);
  console.log("⚠️   requiresManualReview:", result.requiresManualReview);
}

async function main() {
  console.log("🚀  TÜV Extraction Test\n");
  for (const c of CASES) {
    await runCase(c);
  }
  console.log(`\n${"═".repeat(60)}`);
  console.log("✅  Done");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
