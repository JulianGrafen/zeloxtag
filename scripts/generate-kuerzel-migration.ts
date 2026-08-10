/**
 * Regenerate supabase/migrations/00034_seed_abe_auflagen_kuerzel.sql
 * from kürzel.json + auflagen-kuerzel.seed.json.
 *
 * Usage: npx tsx scripts/generate-kuerzel-migration.ts
 */
import fs from "node:fs";
import path from "node:path";

import {
  mergeAuflagenKuerzelMaps,
  normalizeAuflagenKuerzel,
  parseAuflagenKuerzelRecords,
} from "../src/lib/ocr/auflagen-kuerzel-db";

const KUERZEL_PATTERN = /^[A-Z0-9]{2,6}$/;
const OUT_PATH = path.join(
  process.cwd(),
  "supabase/migrations/00034_seed_abe_auflagen_kuerzel.sql",
);

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

function main() {
  const seedPath = path.join(
    process.cwd(),
    "src/lib/ocr/data/auflagen-kuerzel.seed.json",
  );
  const rootPath = path.join(process.cwd(), "kürzel.json");

  const map = mergeAuflagenKuerzelMaps(
    parseAuflagenKuerzelRecords(JSON.parse(fs.readFileSync(seedPath, "utf8"))),
    parseAuflagenKuerzelRecords(
      fs.existsSync(rootPath)
        ? JSON.parse(fs.readFileSync(rootPath, "utf8"))
        : [],
    ),
  );

  const rows = [...map.entries()]
    .map(([kuerzel, text]) => ({
      kuerzel: normalizeAuflagenKuerzel(kuerzel),
      text: text.trim().replace(/\s+/g, " "),
    }))
    .filter(
      (row) =>
        KUERZEL_PATTERN.test(row.kuerzel) &&
        row.text.length >= 8 &&
        row.text.length <= 8000,
    )
    .sort((a, b) => a.kuerzel.localeCompare(b.kuerzel, "de"));

  const values = rows
    .map((row) => `  ('${esc(row.kuerzel)}', '${esc(row.text)}', 'seed')`)
    .join(",\n");

  const sql = `-- =============================================================================
-- ZeloxTag · Seed Auflagen-Kürzel dictionary from kürzel.json
-- Migration: 00034_seed_abe_auflagen_kuerzel
-- =============================================================================
-- ${rows.length} entries (merged kürzel.json + auflagen-kuerzel.seed.json)
-- Regenerate: npx tsx scripts/generate-kuerzel-migration.ts
-- =============================================================================

insert into public.abe_auflagen_kuerzel (kuerzel, text, source)
values
${values}
on conflict (kuerzel) do update
set
  text = excluded.text,
  source = excluded.source,
  updated_at = timezone('utc', now());
`;

  fs.writeFileSync(OUT_PATH, sql);
  console.log(`Wrote ${rows.length} rows to ${OUT_PATH}`);
}

main();
