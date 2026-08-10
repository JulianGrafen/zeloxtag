import seedRecords from "@/lib/ocr/data/auflagen-kuerzel.seed.json";
import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";

/** OCR/LLM often invents this — not in the Kürzel dictionary. */
export const PHANTOM_AUFlagen_KUERZEL = new Set(["CPO"]);

const CONFUSION_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["O", "0"],
  ["O", "E"],
  ["O", "D"],
  ["0", "O"],
  ["E", "O"],
  ["P", "B"],
  ["B", "P"],
  ["P", "R"],
  ["I", "1"],
  ["1", "I"],
  ["S", "5"],
  ["5", "S"],
  ["G", "6"],
  ["6", "G"],
  ["Z", "2"],
  ["2", "Z"],
];

const KNOWN_KUERZEL_FROM_SEED = new Set(
  seedRecords.map((record) => normalizeAuflagenKuerzel(record.kuerzel)),
);

function substitutionCost(from: string, to: string): number {
  if (from === to) return 0;
  for (const [left, right] of CONFUSION_PAIRS) {
    if ((left === from && right === to) || (left === to && right === from)) {
      return 1;
    }
  }
  return 2;
}

/** OCR-aware distance — only same-length codes. */
export function auflagenKuerzelConfusionDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;

  let total = 0;
  for (let index = 0; index < a.length; index++) {
    total += substitutionCost(a[index]!, b[index]!);
  }
  return total;
}

function pickByRawContext(
  candidates: readonly string[],
  rawContext?: string | null,
): string | null {
  const context = rawContext?.toUpperCase();
  if (!context) return null;

  const hits = candidates.filter((candidate) => {
    const code = normalizeAuflagenKuerzel(candidate);
    return code.length > 0 && context.includes(code);
  });

  if (hits.length === 1) {
    return normalizeAuflagenKuerzel(hits[0]!);
  }

  return null;
}

function uniqueSortedMatches(
  code: string,
  pool: readonly string[],
  maxDistance: number,
): string[] {
  const matches = [...new Set(pool)]
    .map((candidate) => ({
      candidate: normalizeAuflagenKuerzel(candidate),
      distance: auflagenKuerzelConfusionDistance(code, candidate),
    }))
    .filter(
      (entry) =>
        entry.candidate &&
        entry.candidate !== code &&
        entry.distance <= maxDistance,
    )
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.candidate.localeCompare(right.candidate, "de"),
    );

  if (matches.length === 0) return [];

  const bestDistance = matches[0]!.distance;
  return matches
    .filter((entry) => entry.distance === bestDistance)
    .map((entry) => entry.candidate);
}

export type CorrectAuflagenKuerzelOptions = {
  allowlist?: readonly string[];
  knownKuerzel?: ReadonlySet<string>;
  rawContext?: string | null;
  maxDistance?: number;
};

/**
 * Map common OCR misreads (e.g. CPO) to valid dictionary / row codes (CPE, CBO).
 */
export function correctAuflagenKuerzelOcr(
  raw: string,
  options: CorrectAuflagenKuerzelOptions = {},
): string {
  const code = normalizeAuflagenKuerzel(raw);
  if (!code) return code;

  const known = options.knownKuerzel ?? KNOWN_KUERZEL_FROM_SEED;
  const maxDistance = options.maxDistance ?? 1;
  const allowlist = [
    ...new Set(
      (options.allowlist ?? [])
        .map(normalizeAuflagenKuerzel)
        .filter(Boolean),
    ),
  ];

  if (known.has(code) && !PHANTOM_AUFlagen_KUERZEL.has(code)) {
    return code;
  }

  if (allowlist.includes(code) && !PHANTOM_AUFlagen_KUERZEL.has(code)) {
    return code;
  }

  const pools: string[][] = [];
  if (allowlist.length > 0) {
    pools.push(allowlist.filter((entry) => known.has(entry)));
  }
  pools.push([...known].filter((entry) => entry.length === code.length));

  for (const pool of pools) {
    const matches = uniqueSortedMatches(code, pool, maxDistance);
    if (matches.length === 1) {
      return matches[0]!;
    }

    const fromContext = pickByRawContext(matches, options.rawContext);
    if (fromContext) {
      return fromContext;
    }

    if (matches.length > 1 && PHANTOM_AUFlagen_KUERZEL.has(code)) {
      const contextHit = pickByRawContext(matches, options.rawContext);
      if (contextHit) return contextHit;
    }
  }

  if (PHANTOM_AUFlagen_KUERZEL.has(code)) {
    const dictionaryMatches = uniqueSortedMatches(
      code,
      [...known],
      maxDistance,
    );
    const fromContext = pickByRawContext(dictionaryMatches, options.rawContext);
    if (fromContext) return fromContext;
  }

  return code;
}

export function correctAuflagenKuerzelList(
  codes: readonly string[],
  options: CorrectAuflagenKuerzelOptions = {},
): string[] {
  const rawContext =
    options.rawContext ??
    codes.join(" ");

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of codes) {
    const corrected = correctAuflagenKuerzelOcr(raw, {
      ...options,
      allowlist: options.allowlist ?? codes,
      rawContext,
    });
    if (
      !corrected ||
      seen.has(corrected) ||
      (PHANTOM_AUFlagen_KUERZEL.has(corrected) &&
        normalizeAuflagenKuerzel(raw) === corrected)
    ) {
      continue;
    }
    seen.add(corrected);
    out.push(corrected);
  }

  return out;
}

export function getKnownAuflagenKuerzelFromSeed(): ReadonlySet<string> {
  return KNOWN_KUERZEL_FROM_SEED;
}
