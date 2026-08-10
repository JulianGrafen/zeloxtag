/**
 * One-time import of repo kürzel.json + seed JSON into Supabase.
 * Usage: npx tsx scripts/seed-abe-auflagen-kuerzel.ts
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
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "../src/lib/supabase/admin";

async function main() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      "Supabase admin not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const seedPath = path.join(
    process.cwd(),
    "src/lib/ocr/data/auflagen-kuerzel.seed.json",
  );
  const rootPath = path.join(process.cwd(), "kürzel.json");

  const records = mergeAuflagenKuerzelMaps(
    parseAuflagenKuerzelRecords(JSON.parse(fs.readFileSync(seedPath, "utf8"))),
    parseAuflagenKuerzelRecords(
      fs.existsSync(rootPath)
        ? JSON.parse(fs.readFileSync(rootPath, "utf8"))
        : [],
    ),
  );

  const rows = [...records.entries()].map(([kuerzel, text]) => ({
    kuerzel: normalizeAuflagenKuerzel(kuerzel),
    text,
    source: "seed" as const,
    learned_by: null,
  }));

  const admin = createAdminClient();
  const { error } = await admin.from("abe_auflagen_kuerzel").upsert(rows, {
    onConflict: "kuerzel",
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log(`Seeded ${rows.length} Auflagen-Kürzel into Supabase.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
