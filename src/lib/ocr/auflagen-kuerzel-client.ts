import seedRecords from "@/lib/ocr/data/auflagen-kuerzel.seed.json";
import {
  mergeAuflagenKuerzelMaps,
  mergeAuflagenKuerzelImageMap,
  normalizeAuflagenKuerzel,
  parseAuflagenKuerzelRecords,
  selectKuerzelRecordsToLearn,
  auflagenKuerzelMapToRecords,
  auflagenKuerzelImageSrc,
  type AuflagenKuerzelRecord,
} from "@/lib/ocr/auflagen-kuerzel-db";

const LOCAL_STORAGE_KEY = "zeloxtag:auflagen-kuerzel-learned";
const LOCAL_IMAGE_STORAGE_KEY = "zeloxtag:auflagen-kuerzel-images";

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

function readLocalImageRecords(): AuflagenKuerzelRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_IMAGE_STORAGE_KEY);
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

function writeLocalImageRecords(records: AuflagenKuerzelRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_IMAGE_STORAGE_KEY, JSON.stringify(records));
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

export function buildClientAuflagenKuerzelImageMap(
  ...extra: AuflagenKuerzelRecord[][]
): Map<string, string> {
  return mergeAuflagenKuerzelImageMap(readLocalImageRecords(), ...extra);
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

export async function uploadAuflagenKuerzelImageClient(
  kuerzel: string,
  file: File,
  text?: string,
): Promise<string> {
  const body = new FormData();
  body.set("kuerzel", normalizeAuflagenKuerzel(kuerzel));
  body.set("file", file);
  if (text?.trim()) body.set("text", text.trim());

  const response = await fetch("/api/abe/auflagen-kuerzel/image", {
    method: "POST",
    body,
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; imageUrl: string }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true || !payload.imageUrl) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Auflagen-Bild Upload fehlgeschlagen (${response.status}).`,
    );
  }

  return payload.imageUrl;
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

export async function persistAuflagenKuerzelCrops(
  crops: ReadonlyMap<string, File>,
  currentImages: Map<string, string>,
  texts: ReadonlyMap<string, string> = new Map(),
): Promise<Map<string, string>> {
  const nextImages = new Map(currentImages);

  for (const [code, file] of crops) {
    const key = normalizeAuflagenKuerzel(code);
    const localUrl = URL.createObjectURL(file);
    nextImages.set(key, localUrl);

    try {
      await uploadAuflagenKuerzelImageClient(
        code,
        file,
        texts.get(key) ?? texts.get(code),
      );
    } catch (error) {
      console.error("[auflagen-kuerzel] image upload failed", code, error);
    }
  }

  writeLocalImageRecords(
    [...nextImages.entries()].map(([kuerzel, imageUrl]) => ({
      kuerzel,
      text: texts.get(kuerzel) ?? "",
      imageUrl: imageUrl.startsWith("blob:")
        ? auflagenKuerzelImageSrc(kuerzel)
        : imageUrl,
    })),
  );

  return nextImages;
}
