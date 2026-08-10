import fs from "node:fs/promises";
import path from "node:path";

import {
  mergeAuflagenKuerzelMaps,
  parseAuflagenKuerzelRecords,
  selectKuerzelRecordsToLearn,
  auflagenKuerzelMapToRecords,
  type AuflagenKuerzelRecord,
} from "@/lib/ocr/auflagen-kuerzel-db";

const SEED_PATH = path.join(
  process.cwd(),
  "src/lib/ocr/data/auflagen-kuerzel.seed.json",
);
const ROOT_KUERZEL_PATH = path.join(process.cwd(), "kürzel.json");
const LEARNED_PATH = path.join(
  process.cwd(),
  "data/auflagen-kuerzel.learned.json",
);

async function readJsonArray(filePath: string): Promise<unknown> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

export async function loadAuflagenKuerzelDb(): Promise<Map<string, string>> {
  const [seed, root, learned] = await Promise.all([
    readJsonArray(SEED_PATH),
    readJsonArray(ROOT_KUERZEL_PATH),
    readJsonArray(LEARNED_PATH),
  ]);

  return mergeAuflagenKuerzelMaps(
    parseAuflagenKuerzelRecords(seed),
    parseAuflagenKuerzelRecords(root),
    parseAuflagenKuerzelRecords(learned),
  );
}

export async function loadLearnedAuflagenKuerzelRecords(): Promise<
  AuflagenKuerzelRecord[]
> {
  const learned = await readJsonArray(LEARNED_PATH);
  return parseAuflagenKuerzelRecords(learned);
}

export async function appendAuflagenKuerzelRecords(
  incoming: readonly AuflagenKuerzelRecord[],
): Promise<{ added: number; total: number }> {
  const current = await loadAuflagenKuerzelDb();
  const toLearn = selectKuerzelRecordsToLearn(incoming, current);
  if (toLearn.length === 0) {
    return { added: 0, total: current.size };
  }

  const learnedRecords = await loadLearnedAuflagenKuerzelRecords();
  const learnedByCode = new Map(
    learnedRecords.map((record) => [record.kuerzel, record] as const),
  );

  for (const record of toLearn) {
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

  const total = (await loadAuflagenKuerzelDb()).size;
  return { added: toLearn.length, total };
}
