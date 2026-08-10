import {
  abeAuflagenEntriesToConditions,
  missingAuflagenCodesInNotes,
  parseAbeAuflagenNotes,
  type AbeAuflageEntry,
} from "@/lib/ocr/abe-auflagen-from-text";

export type AuflagenKuerzelRecord = {
  kuerzel: string;
  text: string;
  imageUrl?: string | null;
};

export function normalizeAuflagenKuerzel(code: string): string {
  return code.trim().toUpperCase();
}

export function parseAuflagenKuerzelRecords(
  raw: unknown,
): AuflagenKuerzelRecord[] {
  if (!Array.isArray(raw)) return [];

  const out: AuflagenKuerzelRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const kuerzel = normalizeAuflagenKuerzel(
      typeof record.kuerzel === "string" ? record.kuerzel : "",
    );
    const text =
      typeof record.text === "string" ? record.text.trim().replace(/\s+/g, " ") : "";
    const imageUrl =
      typeof record.imageUrl === "string" && record.imageUrl.trim()
        ? record.imageUrl.trim()
        : typeof record.image_url === "string" && record.image_url.trim()
          ? record.image_url.trim()
          : null;
    if (!kuerzel || !text) continue;
    out.push({ kuerzel, text, imageUrl });
  }
  return out;
}

/** Merge records; later entries win when text is longer or previous was empty. */
export function mergeAuflagenKuerzelMaps(
  ...sources: AuflagenKuerzelRecord[][]
): Map<string, string> {
  const map = new Map<string, string>();

  for (const records of sources) {
    for (const { kuerzel, text } of records) {
      const key = normalizeAuflagenKuerzel(kuerzel);
      const next = text.trim();
      if (!key || !next) continue;

      const prev = map.get(key);
      if (!prev || next.length > prev.length) {
        map.set(key, next);
      }
    }
  }

  return map;
}

export function mergeAuflagenKuerzelImageMap(
  ...sources: AuflagenKuerzelRecord[][]
): Map<string, string> {
  const map = new Map<string, string>();

  for (const records of sources) {
    for (const { kuerzel, imageUrl } of records) {
      const key = normalizeAuflagenKuerzel(kuerzel);
      const url = imageUrl?.trim();
      if (!key || !url) continue;
      map.set(key, url);
    }
  }

  return map;
}

export function lookupAuflagenKuerzelText(
  code: string,
  db: Map<string, string>,
): string | null {
  const key = normalizeAuflagenKuerzel(code);
  if (!key) return null;
  return db.get(key) ?? null;
}

export function auflagenKuerzelMapToRecords(
  db: Map<string, string>,
  imageUrls?: Map<string, string>,
): AuflagenKuerzelRecord[] {
  return [...db.entries()]
    .map(([kuerzel, text]) => ({
      kuerzel,
      text,
      imageUrl: imageUrls?.get(kuerzel) ?? null,
    }))
    .sort((a, b) => a.kuerzel.localeCompare(b.kuerzel, "de"));
}

function formatKuerzelNoteLine(code: string, text: string): string {
  return `${normalizeAuflagenKuerzel(code)}: ${text.trim()}`;
}

/**
 * Add missing Kürzel texts from the database into flat auflagenNotes prose.
 */
export function augmentAuflagenNotesWithKuerzelDb(
  existingNotes: string | null | undefined,
  targetCodes: readonly string[],
  db: Map<string, string>,
): string | null {
  if (targetCodes.length === 0) return existingNotes?.trim() || null;

  const missing = missingAuflagenCodesInNotes(existingNotes, [...targetCodes]);
  const additions: string[] = [];

  for (const code of missing) {
    const text = lookupAuflagenKuerzelText(code, db);
    if (!text) continue;
    additions.push(formatKuerzelNoteLine(code, text));
  }

  if (additions.length === 0) {
    return existingNotes?.trim() || null;
  }

  const base = existingNotes?.trim();
  return base ? `${base}\n\n${additions.join("\n\n")}` : additions.join("\n\n");
}

export function resolveAuflagenWithKuerzelDb(
  existingNotes: string | null | undefined,
  targetCodes: readonly string[],
  db: Map<string, string>,
): {
  notes: string | null;
  missingCodes: string[];
  dbFilledCodes: string[];
  allResolved: boolean;
} {
  const notes = augmentAuflagenNotesWithKuerzelDb(existingNotes, targetCodes, db);
  const missingCodes = missingAuflagenCodesInNotes(notes, [...targetCodes]);
  const missingSet = new Set(missingCodes.map((code) => code.toUpperCase()));

  const dbFilledCodes = targetCodes.filter((code) => {
    const normalized = normalizeAuflagenKuerzel(code);
    return db.has(normalized) && !missingSet.has(normalized);
  });

  const allResolved =
    targetCodes.length === 0
      ? Boolean(notes?.trim())
      : missingCodes.length === 0;

  return { notes, missingCodes, dbFilledCodes, allResolved };
}

export function auflagenCodesResolvableFromKuerzelDb(
  targetCodes: readonly string[],
  db: Map<string, string>,
  notes?: string | null,
): string[] {
  return targetCodes.filter((code) => {
    const normalized = normalizeAuflagenKuerzel(code);
    if (!normalized) return false;
    if (lookupAuflagenKuerzelText(normalized, db)) return true;
    return missingAuflagenCodesInNotes(notes, [code]).length === 0;
  });
}

export function auflagenCodesMissingAfterKuerzelDb(
  targetCodes: readonly string[],
  db: Map<string, string>,
  notes?: string | null,
): string[] {
  const augmented = augmentAuflagenNotesWithKuerzelDb(notes, targetCodes, db);
  return missingAuflagenCodesInNotes(augmented, [...targetCodes]);
}

/** Parse OCR notes into Kürzel records for learning new DB entries. */
export function extractKuerzelRecordsFromOcrNotes(
  notes: string,
  targetCodes: readonly string[],
): AuflagenKuerzelRecord[] {
  if (targetCodes.length === 0) return [];

  const allowed = new Set(targetCodes.map(normalizeAuflagenKuerzel));
  const entries = parseAbeAuflagenNotes(notes, [...targetCodes], {
    strict: true,
  });
  return entries
    .filter((entry) => allowed.has(normalizeAuflagenKuerzel(entry.code)))
    .map((entry) => ({
      kuerzel: normalizeAuflagenKuerzel(entry.code),
      text: entry.text.trim(),
    }))
    .filter((entry) => entry.kuerzel && entry.text.length >= 8);
}

/** Entries worth persisting — new codes or strictly longer text. */
export function selectKuerzelRecordsToLearn(
  incoming: readonly AuflagenKuerzelRecord[],
  db: Map<string, string>,
): AuflagenKuerzelRecord[] {
  const out: AuflagenKuerzelRecord[] = [];

  for (const record of incoming) {
    const key = normalizeAuflagenKuerzel(record.kuerzel);
    const text = record.text.trim();
    if (!key || text.length < 8) continue;

    const existing = db.get(key);
    if (!existing || text.length > existing.length + 20) {
      out.push({ kuerzel: key, text });
    }
  }

  return out;
}

export function kuerzelRecordsToAuflagenNotes(
  records: readonly AuflagenKuerzelRecord[],
): string {
  const entries: AbeAuflageEntry[] = records.map(({ kuerzel, text }) => ({
    code: kuerzel,
    text,
  }));
  return abeAuflagenEntriesToConditions(entries).join("\n\n");
}
