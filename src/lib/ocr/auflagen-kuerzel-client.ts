import seedRecords from "@/lib/ocr/data/auflagen-kuerzel.seed.json";
import {
  mergeAuflagenKuerzelMaps,
  parseAuflagenKuerzelRecords,
  selectKuerzelRecordsToLearn,
  auflagenKuerzelMapToRecords,
  type AuflagenKuerzelRecord,
} from "@/lib/ocr/auflagen-kuerzel-db";

const LOCAL_STORAGE_KEY = "zeloxtag:auflagen-kuerzel-learned";

function readLocalLearnedRecords(): AuflagenKuerzelRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return parseAuflagenKuerzelRecords(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeLocalLearnedRecords(records: AuflagenKuerzelRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Quota or private mode — non-fatal.
  }
}

export function buildClientAuflagenKuerzelDb(
  ...extra: AuflagenKuerzelRecord[][]
): Map<string, string> {
  return mergeAuflagenKuerzelMaps(
    parseAuflagenKuerzelRecords(seedRecords),
    readLocalLearnedRecords(),
    ...extra,
  );
}

export async function fetchServerAuflagenKuerzelRecords(): Promise<
  AuflagenKuerzelRecord[]
> {
  const response = await fetch("/api/abe/auflagen-kuerzel", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; records: AuflagenKuerzelRecord[] }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Kürzel-Datenbank nicht geladen (${response.status}).`,
    );
  }

  return parseAuflagenKuerzelRecords(payload.records);
}

export async function learnAuflagenKuerzelRecords(
  incoming: readonly AuflagenKuerzelRecord[],
  currentDb: Map<string, string>,
): Promise<Map<string, string>> {
  const toLearn = selectKuerzelRecordsToLearn(incoming, currentDb);
  if (toLearn.length === 0) return currentDb;

  const local = readLocalLearnedRecords();
  const mergedLocal = mergeAuflagenKuerzelMaps(local, toLearn);
  writeLocalLearnedRecords(
    [...mergedLocal.entries()].map(([kuerzel, text]) => ({ kuerzel, text })),
  );

  let nextDb = mergeAuflagenKuerzelMaps(
    auflagenKuerzelMapToRecords(currentDb),
    toLearn,
  );

  try {
    const response = await fetch("/api/abe/auflagen-kuerzel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: toLearn }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok: true; records: AuflagenKuerzelRecord[] }
      | { ok: false; error?: string }
      | null;

    if (response.ok && payload?.ok === true) {
      nextDb = mergeAuflagenKuerzelMaps(
        parseAuflagenKuerzelRecords(payload.records),
      );
    }
  } catch {
    // Server write may fail on read-only deploy — local cache still helps.
  }

  return nextDb;
}
