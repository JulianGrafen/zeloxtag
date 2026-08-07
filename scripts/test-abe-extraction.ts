/**
 * Manual extraction test against real ABE scan images.
 * Usage: npx tsx scripts/test-abe-extraction.ts
 */

import fs from "node:fs";
import path from "node:path";

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

import { abeExtractionService } from "../src/services/ocr/AbeExtractionService";

// ─── Ground truth ──────────────────────────────────────────────────────────────

const COVER_FILE = "/Users/julian/Downloads/IMG_6983.jpg";
const MAIN_FILE  = "/Users/julian/Downloads/IMG_6984.jpg";
const VEHICLES_FILE = "/Users/julian/Downloads/IMG_6986.jpg";

const EXPECTED_COVER = {
  kbaNumber: "48185",
  abeNumber: /AVAG9/i,           // partial match – full number partially obscured
  manufacturer: /alcar/i,
  designType: /valencia/i,
  dimensions: /8J.*18H2.*5x120.*ET.*30/i,
  articleNumbers: ["AVAG9HA30", "AVAG9BP30"],
};

const EXPECTED_MAIN = {
  abeNumber: "48185*08",
  abeHolder: /alcar leichtmetallr/i,
  manufacturer: /alcar leichtmetallr/i,
  testingOrganization: /kraftfahrt-bundesamt/i,
};

const EXPECTED_VEHICLES = {
  minRows: 4,
  expectedModels: [/5er reihe/i, /gran turismo/i, /6er reihe/i],
  expectedTypeApprovals: [/e1\*2007\/46\*0363/i, /e1\*2007\/46\*0508/i],
  expectedTyreSizes: ["245/45R18", "255/45R18", "225/50R18"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(file: string): { bytes: Buffer; contentType: "image/jpeg" } {
  return { bytes: fs.readFileSync(file), contentType: "image/jpeg" };
}

function check(label: string, ok: boolean, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`  ${icon} ${label}${detail ? ` → ${detail}` : ""}`);
  return ok;
}

function matchField(
  label: string,
  actual: string | null | undefined,
  expected: string | RegExp,
): boolean {
  if (!actual) return check(label, false, "null/undefined");
  const ok =
    typeof expected === "string"
      ? actual === expected
      : expected.test(actual);
  return check(label, ok, actual);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function testCover() {
  console.log("\n═══ Step 1: Deckblatt (IMG_6983) ═══");
  const input = loadImage(COVER_FILE);
  const result = await abeExtractionService.extractCoverFromDocument(input);

  console.log("\nRaw result:");
  console.log(JSON.stringify(result, null, 2));

  console.log("\nChecks:");
  let passed = 0;
  let total = 0;

  const fields: Array<[string, string | null | undefined, string | RegExp]> = [
    ["kbaNumber", result.kbaNumber, EXPECTED_COVER.kbaNumber],
    ["abeNumber", result.abeNumber, EXPECTED_COVER.abeNumber],
    ["manufacturer", result.manufacturer, EXPECTED_COVER.manufacturer],
    ["designType", result.designType, EXPECTED_COVER.designType],
    ["dimensions", result.dimensions, EXPECTED_COVER.dimensions],
  ];

  for (const [label, actual, expected] of fields) {
    total++;
    if (matchField(label, actual, expected)) passed++;
  }

  // Article numbers check
  total++;
  const articles = result.articleNumbers ?? [];
  const artOk = EXPECTED_COVER.articleNumbers.every((a) =>
    articles.some((r) => r.toUpperCase() === a.toUpperCase()),
  );
  check(
    "articleNumbers",
    artOk,
    articles.join(", ") || "(empty)",
  );
  if (artOk) passed++;

  console.log(`\nCover score: ${passed}/${total}`);
  return { passed, total };
}

async function testMain() {
  console.log("\n═══ Step 2: ABE Hauptseite (IMG_6984) ═══");
  const input = loadImage(MAIN_FILE);
  const result = await abeExtractionService.extractMainFromDocument(input);

  console.log("\nRaw result:");
  console.log(JSON.stringify(result, null, 2));

  console.log("\nChecks:");
  let passed = 0;
  let total = 0;

  const fields: Array<[string, string | null | undefined, string | RegExp]> = [
    ["abeNumber", result.abeNumber, EXPECTED_MAIN.abeNumber],
    ["abeHolder", result.abeHolder, EXPECTED_MAIN.abeHolder],
    ["manufacturer", result.manufacturer, EXPECTED_MAIN.manufacturer],
    ["testingOrganization", result.testingOrganization, EXPECTED_MAIN.testingOrganization],
  ];

  for (const [label, actual, expected] of fields) {
    total++;
    if (matchField(label, actual, expected)) passed++;
  }

  console.log(`\nMain score: ${passed}/${total}`);
  return { passed, total };
}

async function testVehicles() {
  console.log("\n═══ Step 3: Fahrzeugtabelle (IMG_6986) ═══");
  const input = loadImage(VEHICLES_FILE);
  const result = await abeExtractionService.extractVehiclesFromDocument(input);

  console.log("\nRaw result:");
  console.log(JSON.stringify(result, null, 2));

  console.log("\nChecks:");
  let passed = 0;
  let total = 0;

  // Minimum row count
  total++;
  const rowCount = result.vehicleMatches.length;
  const rowOk = rowCount >= EXPECTED_VEHICLES.minRows;
  check("minRows", rowOk, `${rowCount} rows (expected ≥ ${EXPECTED_VEHICLES.minRows})`);
  if (rowOk) passed++;

  // Model names
  const allModels = result.vehicleMatches.map((m) => m.model).join(" | ");
  for (const pattern of EXPECTED_VEHICLES.expectedModels) {
    total++;
    const found = result.vehicleMatches.some((m) => pattern.test(m.model));
    check(`model matches ${pattern}`, found, allModels);
    if (found) passed++;
  }

  // Type approvals
  const allApprovals = result.vehicleMatches
    .map((m) => m.typeApproval ?? "")
    .join(" | ");
  for (const pattern of EXPECTED_VEHICLES.expectedTypeApprovals) {
    total++;
    const found = result.vehicleMatches.some(
      (m) => m.typeApproval && pattern.test(m.typeApproval),
    );
    check(`typeApproval matches ${pattern}`, found, allApprovals.slice(0, 100));
    if (found) passed++;
  }

  // Tyre sizes
  const allTyres = result.vehicleMatches.flatMap((m) => m.tireSizes);
  for (const size of EXPECTED_VEHICLES.expectedTyreSizes) {
    total++;
    const found = allTyres.some(
      (t) => t.replace(/\s/g, "").toUpperCase().includes(size.replace(/\s/g, "").toUpperCase()),
    );
    check(`tyre size ${size}`, found, allTyres.slice(0, 8).join(", "));
    if (found) passed++;
  }

  console.log(`\nVehicles score: ${passed}/${total}`);
  return { passed, total };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 ABE Extraction Test\n");

  let totalPassed = 0;
  let totalChecks = 0;

  const coverResult = await testCover();
  totalPassed += coverResult.passed;
  totalChecks += coverResult.total;

  const mainResult = await testMain();
  totalPassed += mainResult.passed;
  totalChecks += mainResult.total;

  const vehiclesResult = await testVehicles();
  totalPassed += vehiclesResult.passed;
  totalChecks += vehiclesResult.total;

  const pct = Math.round((totalPassed / totalChecks) * 100);
  console.log(`\n${"═".repeat(40)}`);
  console.log(`Overall: ${totalPassed}/${totalChecks} (${pct}%)`);
  if (pct >= 90) {
    console.log("✅ Target reached (≥ 90%)");
  } else {
    console.log("⚠️  Below target — see failures above");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
