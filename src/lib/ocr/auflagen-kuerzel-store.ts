import fs from "node:fs/promises";
import path from "node:path";

import { AUFLAGEN_KUERZEL_BUCKET } from "@/lib/documents/constants";
import {
  mergeAuflagenKuerzelMaps,
  mergeAuflagenKuerzelImageMap,
  normalizeAuflagenKuerzel,
  parseAuflagenKuerzelRecords,
  selectKuerzelRecordsToLearn,
  auflagenKuerzelMapToRecords,
  type AuflagenKuerzelRecord,
} from "@/lib/ocr/auflagen-kuerzel-db";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";

const SEED_PATH = path.join(
  process.cwd(),
  "src/lib/ocr/data/auflagen-kuerzel.seed.json",
);
const ROOT_KUERZEL_PATH = path.join(process.cwd(), "kürzel.json");
const LEARNED_PATH = path.join(
  process.cwd(),
  "data/auflagen-kuerzel.learned.json",
);

function publicUrlForKuerzelImage(imagePath: string | null | undefined): string | null {
  const trimmed = imagePath?.trim();
  if (!trimmed) return null;
  const { url, isConfigured } = getSupabaseEnv();
  if (!isConfigured) return null;
  return `${url}/storage/v1/object/public/${AUFLAGEN_KUERZEL_BUCKET}/${trimmed}`;
}

async function readJsonArray(filePath: string): Promise<unknown> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

async function loadFilesystemKuerzelRecords(): Promise<AuflagenKuerzelRecord[]> {
  const [seed, root, learned] = await Promise.all([
    readJsonArray(SEED_PATH),
    readJsonArray(ROOT_KUERZEL_PATH),
    readJsonArray(LEARNED_PATH),
  ]);

  const map = mergeAuflagenKuerzelMaps(
    parseAuflagenKuerzelRecords(seed),
    parseAuflagenKuerzelRecords(root),
    parseAuflagenKuerzelRecords(learned),
  );

  return auflagenKuerzelMapToRecords(map);
}

async function loadSupabaseKuerzelRecords(): Promise<AuflagenKuerzelRecord[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("abe_auflagen_kuerzel")
    .select("kuerzel, text, image_path");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    kuerzel: normalizeAuflagenKuerzel(row.kuerzel),
    text: row.text.trim(),
    imageUrl: publicUrlForKuerzelImage(row.image_path),
  }));
}

export async function loadAuflagenKuerzelDb(): Promise<Map<string, string>> {
  let supabaseRecords: AuflagenKuerzelRecord[] = [];
  try {
    supabaseRecords = await loadSupabaseKuerzelRecords();
  } catch (error) {
    console.error("[auflagen-kuerzel] Supabase read failed", error);
  }

  const filesystemRecords = await loadFilesystemKuerzelRecords();
  return mergeAuflagenKuerzelMaps(filesystemRecords, supabaseRecords);
}

export async function loadAuflagenKuerzelRecordsWithImages(): Promise<
  AuflagenKuerzelRecord[]
> {
  const filesystemRecords = await loadFilesystemKuerzelRecords();
  let supabaseRecords: AuflagenKuerzelRecord[] = [];
  try {
    supabaseRecords = await loadSupabaseKuerzelRecords();
  } catch (error) {
    console.error("[auflagen-kuerzel] Supabase read failed", error);
  }

  const textMap = mergeAuflagenKuerzelMaps(filesystemRecords, supabaseRecords);
  const imageMap = mergeAuflagenKuerzelImageMap(supabaseRecords);
  return auflagenKuerzelMapToRecords(textMap, imageMap);
}

export async function loadLearnedAuflagenKuerzelRecords(): Promise<
  AuflagenKuerzelRecord[]
> {
  try {
    const supabaseRecords = await loadSupabaseKuerzelRecords();
    if (supabaseRecords.length > 0) {
      return supabaseRecords;
    }
  } catch (error) {
    console.error("[auflagen-kuerzel] Supabase learned read failed", error);
  }

  return parseAuflagenKuerzelRecords(await readJsonArray(LEARNED_PATH));
}

async function appendFilesystemLearnedRecords(
  records: readonly AuflagenKuerzelRecord[],
): Promise<void> {
  const learnedRecords = await parseAuflagenKuerzelRecords(
    await readJsonArray(LEARNED_PATH),
  );
  const learnedByCode = new Map(
    learnedRecords.map((record) => [record.kuerzel, record] as const),
  );

  for (const record of records) {
    learnedByCode.set(record.kuerzel, record);
  }

  const nextLearned = auflagenKuerzelMapToRecords(
    new Map([...learnedByCode.entries()].map(([k, v]) => [k, v.text])),
  );

  await fs.mkdir(path.dirname(LEARNED_PATH), { recursive: true });
  await fs.writeFile(
    LEARNED_PATH,
    `${JSON.stringify(nextLearned, null, 2)}\n`,
    "utf8",
  );
}

async function appendSupabaseKuerzelRecords(
  records: readonly AuflagenKuerzelRecord[],
  learnedByUserId?: string | null,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured() || records.length === 0) {
    return false;
  }

  const admin = createAdminClient();
  const rows = records.map((record) => ({
    kuerzel: normalizeAuflagenKuerzel(record.kuerzel),
    text: record.text.trim(),
    source: "learned" as const,
    learned_by: learnedByUserId ?? null,
  }));

  const { error } = await admin.from("abe_auflagen_kuerzel").upsert(rows, {
    onConflict: "kuerzel",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function uploadAuflagenKuerzelImage(
  kuerzel: string,
  bytes: Buffer,
  contentType: string,
  learnedByUserId?: string | null,
): Promise<{ imagePath: string; imageUrl: string }> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin is not configured.");
  }

  const code = normalizeAuflagenKuerzel(kuerzel);
  if (!code) {
    throw new Error("Ungültiges Kürzel.");
  }

  const ext = contentType.includes("png") ? "png" : "jpg";
  const imagePath = `${code}.${ext}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(AUFLAGEN_KUERZEL_BUCKET)
    .upload(imagePath, bytes, {
      upsert: true,
      contentType: contentType.includes("png") ? "image/png" : "image/jpeg",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: existing, error: readError } = await admin
    .from("abe_auflagen_kuerzel")
    .select("text")
    .eq("kuerzel", code)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (!existing?.text?.trim()) {
    throw new Error(
      `Kürzel ${code} muss zuerst mit Text gespeichert werden.`,
    );
  }

  const { error: updateError } = await admin
    .from("abe_auflagen_kuerzel")
    .update({ image_path: imagePath })
    .eq("kuerzel", code);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const imageUrl = publicUrlForKuerzelImage(imagePath);
  if (!imageUrl) {
    throw new Error("Bild-URL konnte nicht erzeugt werden.");
  }

  return { imagePath, imageUrl };
}

export async function attachAuflagenKuerzelImagePath(
  kuerzel: string,
  imagePath: string,
): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const code = normalizeAuflagenKuerzel(kuerzel);
  const admin = createAdminClient();
  const { error } = await admin
    .from("abe_auflagen_kuerzel")
    .update({ image_path: imagePath })
    .eq("kuerzel", code);

  if (error) {
    throw new Error(error.message);
  }

  return publicUrlForKuerzelImage(imagePath);
}

export async function appendAuflagenKuerzelRecords(
  incoming: readonly AuflagenKuerzelRecord[],
  learnedByUserId?: string | null,
): Promise<{ added: number; total: number; persistedTo: "supabase" | "filesystem" }> {
  const current = await loadAuflagenKuerzelDb();
  const toLearn = selectKuerzelRecordsToLearn(incoming, current);
  if (toLearn.length === 0) {
    return { added: 0, total: current.size, persistedTo: "supabase" };
  }

  let persistedTo: "supabase" | "filesystem" = "filesystem";

  try {
    const saved = await appendSupabaseKuerzelRecords(toLearn, learnedByUserId);
    if (saved) {
      persistedTo = "supabase";
    }
  } catch (error) {
    console.error("[auflagen-kuerzel] Supabase write failed", error);
  }

  if (persistedTo !== "supabase") {
    await appendFilesystemLearnedRecords(toLearn);

    try {
      const rootRecords = parseAuflagenKuerzelRecords(
        await readJsonArray(ROOT_KUERZEL_PATH),
      );
      const rootMap = mergeAuflagenKuerzelMaps(rootRecords);
      const nextRoot = [...rootRecords];

      for (const record of toLearn) {
        if (rootMap.has(record.kuerzel)) continue;
        nextRoot.push(record);
        rootMap.set(record.kuerzel, record.text);
      }

      if (nextRoot.length > rootRecords.length) {
        await fs.writeFile(
          ROOT_KUERZEL_PATH,
          `${JSON.stringify(nextRoot, null, 4)}\n`,
          "utf8",
        );
      }
    } catch {
      // Root kürzel.json is optional (e.g. read-only deploy).
    }
  }

  const total = (await loadAuflagenKuerzelDb()).size;
  return { added: toLearn.length, total, persistedTo };
}

export async function upsertAuflagenKuerzelWithImage(
  record: AuflagenKuerzelRecord,
  imageBytes: Buffer,
  contentType: string,
  learnedByUserId?: string | null,
): Promise<AuflagenKuerzelRecord> {
  await appendAuflagenKuerzelRecords([record], learnedByUserId);
  const { imagePath, imageUrl } = await uploadAuflagenKuerzelImage(
    record.kuerzel,
    imageBytes,
    contentType,
    learnedByUserId,
  );
  await attachAuflagenKuerzelImagePath(record.kuerzel, imagePath);
  return { ...record, imageUrl };
}
