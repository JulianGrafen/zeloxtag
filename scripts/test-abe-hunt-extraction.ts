/**
 * Manual hunt-all extraction calibration against KBA 48571 Gutachten scans.
 * Usage: npx tsx scripts/test-abe-hunt-extraction.ts
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

import {
  ABE_KBA_48571_EXPECTED_STAMMDATEN,
  ABE_KBA_48571_FIXTURE_IMAGES,
  ABE_KBA_48571_LLM_VEHICLE_ROWS,
} from "../src/lib/ocr/__fixtures__/abe-kba-48571-interpneu";
import { auflagenForUserVehicleSelection } from "../src/lib/ocr/abe-wizard-vehicle-match";
import { abeDataHunterExtractionService } from "../src/services/documents/AbeExtractionService";
import {
  finalizeAbeDataHunterReport,
  isAbeCoreHuntComplete,
  isAbeDataHunterReportComplete,
  missingAbeCoreHuntFields,
} from "../src/lib/validations/abeDataHunterSchemas";

function loadImage(file: string): { bytes: Buffer; contentType: "image/png" } {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing fixture image: ${file}`);
  }
  return { bytes: fs.readFileSync(file), contentType: "image/png" };
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

async function extractPhoto(label: string, file: string) {
  console.log(`\n═══ ${label} ═══`);
  const result = await abeDataHunterExtractionService.extractAllFromPhoto(
    loadImage(file),
  );
  console.log(JSON.stringify(result.extraction, null, 2));
  return result.extraction;
}

async function main() {
  let report = finalizeAbeDataHunterReport(
    await extractPhoto("Stammdaten (IMG_7041)", ABE_KBA_48571_FIXTURE_IMAGES.stammdaten),
  );

  console.log("\nChecks (page 1):");
  matchField("kbaNumber", report.kbaNumber, ABE_KBA_48571_EXPECTED_STAMMDATEN.kbaNumber);
  matchField(
    "abeHolder",
    report.abeHolder,
    ABE_KBA_48571_EXPECTED_STAMMDATEN.abeHolder,
  );
  matchField(
    "manufacturer",
    report.manufacturer,
    ABE_KBA_48571_EXPECTED_STAMMDATEN.manufacturer,
  );
  matchField(
    "partDesignation",
    report.partDesignation,
    ABE_KBA_48571_EXPECTED_STAMMDATEN.partDesignation,
  );

  const tablePage = finalizeAbeDataHunterReport(
    await extractPhoto(
      "Verwendungsbereich (IMG_7042)",
      ABE_KBA_48571_FIXTURE_IMAGES.verwendungsbereich1,
    ),
  );

  report = finalizeAbeDataHunterReport({
    ...report,
    vehicleMatches: [...report.vehicleMatches, ...tablePage.vehicleMatches],
  });

  console.log(`\nVehicle rows after merge: ${report.vehicleMatches.length}`);
  for (const row of report.vehicleMatches.slice(0, 8)) {
    console.log(
      `  · ${row.verkaufsbezeichnung} | ${row.fahrzeugtyp ?? "-"} | ${row.auflagenCodes.join(" ") || "-"}`,
    );
  }

  const missingCore = missingAbeCoreHuntFields(report);
  console.log(`\nMissing core hunt fields: ${missingCore.join(", ") || "(none)"}`);
  check("core hunt complete", isAbeCoreHuntComplete(report));

  const expectedTypCodes = new Set(
    ABE_KBA_48571_LLM_VEHICLE_ROWS.map((row) => row.fahrzeugtyp.toUpperCase()),
  );
  const extractedTypCodes = new Set(
    report.vehicleMatches
      .map((row) => row.fahrzeugtyp?.trim().toUpperCase())
      .filter(Boolean) as string[],
  );
  for (const code of expectedTypCodes) {
    check(`fahrzeugtyp ${code} present`, extractedTypCodes.has(code));
  }
  check(
    "no tire-only rows without fahrzeugtyp",
    report.vehicleMatches.every((row) => Boolean(row.fahrzeugtyp?.trim())),
  );

  const targetCodes = auflagenForUserVehicleSelection(report, 0, null);
  console.log(`\nTarget Auflagen for first group: ${targetCodes.join(", ")}`);

  const auflagenResult =
    await abeDataHunterExtractionService.extractAuflagenTextFromPhoto(
      loadImage(ABE_KBA_48571_FIXTURE_IMAGES.auflagenText),
      targetCodes.slice(0, 8),
    );

  console.log("\n═══ Auflagen-Text (IMG_7043) ═══");
  console.log(
    JSON.stringify(
      {
        notes: auflagenResult.extraction.auflagenNotes?.slice(0, 400),
        regions: auflagenResult.extraction.regions?.length ?? 0,
      },
      null,
      2,
    ),
  );

  report = finalizeAbeDataHunterReport({
    ...report,
    auflagenNotes: auflagenResult.extraction.auflagenNotes,
  });

  check(
    "full report complete",
    isAbeDataHunterReportComplete(report, "BMW 3er-Compact", null, {
      selectedGroupIndex: 0,
      selectedRowId: report.vehicleMatches.find((row) => row.fahrzeugtyp === "346K")
        ? `${report.vehicleMatches.findIndex((row) => row.fahrzeugtyp === "346K")}`
        : null,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
