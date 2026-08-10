/**
 * Import kürzel.json + seed JSON into Supabase (idempotent upsert).
 * Usage: npm run db:seed-kuerzel
 *
 * Prefer `supabase db push` — migration 00034 seeds the same data automatically.
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
  mergeAuflagenKuerzelMaps,
  normalizeAuflagenKuerzel,
  parseAuflagenKuerzelRecords,
} from "../src/lib/ocr/auflagen-kuerzel-db";

const KUERZEL_PATTERN = /^[A-Z0-9]{2,6}$/;

function readServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    ""
  );
}

function loadMergedRecords() {
  const seedPath = path.join(
    process.cwd(),
    "src/lib/ocr/data/auflagen-kuerzel.seed.json",
  );
  const rootPath = path.join(process.cwd(), "kürzel.json");

  return mergeAuflagenKuerzelMaps(
    parseAuflagenKuerzelRecords(JSON.parse(fs.readFileSync(seedPath, "utf8"))),
    parseAuflagenKuerzelRecords(
      fs.existsSync(rootPath)
        ? JSON.parse(fs.readFileSync(rootPath, "utf8"))
        : [],
    ),
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = readServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const records = loadMergedRecords();
  const rows = [...records.entries()]
    .map(([kuerzel, text]) => ({
      kuerzel: normalizeAuflagenKuerzel(kuerzel),
      text: text.trim(),
      source: "seed" as const,
      learned_by: null,
    }))
    .filter(
      (row) =>
        KUERZEL_PATTERN.test(row.kuerzel) &&
        row.text.length >= 8 &&
        row.text.length <= 8000,
    );

  const response = await fetch(`${url}/rest/v1/abe_auflagen_kuerzel`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Supabase upsert failed (${response.status}): ${body || response.statusText}`,
    );
  }

  console.log(`Seeded ${rows.length} Auflagen-Kürzel into Supabase.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
