import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import type {
  GutachtenDocumentSubtype,
  GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";

type WeightedPattern = { pattern: RegExp; weight: number };

const TEILEGUTACHTEN_PATTERNS: WeightedPattern[] = [
  { pattern: /\bteilegutachten\b/i, weight: 14 },
  { pattern: /\b§\s*19\s*abs\.?\s*3\b/i, weight: 12 },
  { pattern: /\bverwendungsbereich\b/i, weight: 5 },
  { pattern: /\bfahrzeugteil\b/i, weight: 4 },
  { pattern: /\bart\s+der\s+umrüstung\b/i, weight: 4 },
  { pattern: /\bkennzeichnung\b/i, weight: 3 },
  { pattern: /\bsofortige\s+abnahme\b/i, weight: 4 },
];

const ANBAUBESTAETIGUNG_PATTERNS: WeightedPattern[] = [
  { pattern: /\b§\s*19\s*\(\s*2\s*\)/i, weight: 16 },
  { pattern: /\b§\s*19\s*abs\.?\s*2\b/i, weight: 14 },
  { pattern: /\bprüfung\s+nach\s+§\s*19\b/i, weight: 12 },
  {
    pattern: /\bgutachten\s+zur\s+erlangung\s+der\s+betriebserlaubnis\b/i,
    weight: 11,
  },
  {
    pattern: /\baufstellung\s+der\s+technischen\s+vorschriften\b/i,
    weight: 9,
  },
  { pattern: /\banbauabnahme\b/i, weight: 8 },
  { pattern: /\bbegutachtung\s+der\s+abnahme\b/i, weight: 7 },
  { pattern: /\buntersuchungsbericht\b/i, weight: 3 },
];

const EINZELABNAHME_PATTERNS: WeightedPattern[] = [
  { pattern: /\b§\s*21\b/i, weight: 14 },
  { pattern: /\beinzelabnahme\b/i, weight: 12 },
  { pattern: /\bänderungsabnahme\b/i, weight: 10 },
  { pattern: /\beinzelbetriebserlaubnis\b/i, weight: 10 },
  { pattern: /\bfeld\s*22\b/i, weight: 6 },
  { pattern: /\bfahrgestellnummer\b/i, weight: 4 },
];

export type GutachtenSubtypeScores = Record<GutachtenDocumentSubtype, number>;

function scorePatterns(text: string, patterns: WeightedPattern[]): number {
  let total = 0;
  for (const { pattern, weight } of patterns) {
    if (pattern.test(text)) total += weight;
  }
  return total;
}

export function buildGutachtenResolutionText(input: {
  extraction: GutachtenExtraction;
  fields: InvoiceTextParseResult;
  rawText?: string | null;
}): string {
  return [
    input.rawText,
    input.extraction.partName,
    input.extraction.modificationType,
    input.extraction.vehicleMatchNotes,
    input.extraction.modificationsField22,
    input.extraction.matchedVehicleRow,
    input.fields.partCategory,
    input.fields.notes,
    input.fields.summary,
    input.fields.authority,
    input.fields.vendor,
    input.fields.conditions?.join("\n"),
    input.fields.vehicleApprovals?.join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

export function scoreGutachtenDocumentSubtypes(
  text: string,
): GutachtenSubtypeScores {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return {
      TEILEGUTACHTEN: 0,
      EINZELABNAHME: 0,
      ANBAUBESTAETIGUNG: 0,
      SONSTIGES: 0,
    };
  }

  return {
    TEILEGUTACHTEN: scorePatterns(normalized, TEILEGUTACHTEN_PATTERNS),
    EINZELABNAHME: scorePatterns(normalized, EINZELABNAHME_PATTERNS),
    ANBAUBESTAETIGUNG: scorePatterns(normalized, ANBAUBESTAETIGUNG_PATTERNS),
    SONSTIGES: 0,
  };
}

export function isAmbiguousTeilegutachtenVsPruefung192(
  scores: GutachtenSubtypeScores,
): boolean {
  const tg = scores.TEILEGUTACHTEN;
  const p192 = scores.ANBAUBESTAETIGUNG;
  return tg >= 4 && p192 >= 4 && Math.abs(tg - p192) <= 4;
}

export function needsGutachtenSubtypeConfirmation(
  extraction: GutachtenExtraction,
  fields: InvoiceTextParseResult,
  rawText?: string | null,
): boolean {
  if (extraction.documentSubtype === "SONSTIGES") return true;
  const scores = scoreGutachtenDocumentSubtypes(
    buildGutachtenResolutionText({ extraction, fields, rawText }),
  );
  return isAmbiguousTeilegutachtenVsPruefung192(scores);
}

/**
 * Merge LLM subtype with deterministic text scoring.
 * Prefers explicit §19 Abs. 2 vs Abs. 3 markers over generic LLM guesses.
 */
export function resolveGutachtenDocumentSubtype(input: {
  llmSubtype: GutachtenDocumentSubtype;
  extraction: GutachtenExtraction;
  fields: InvoiceTextParseResult;
  rawText?: string | null;
}): GutachtenDocumentSubtype {
  const text = buildGutachtenResolutionText({
    extraction: input.extraction,
    fields: input.fields,
    rawText: input.rawText,
  });
  const scores = scoreGutachtenDocumentSubtypes(text);

  // Hard paragraph disambiguation (most reliable on cover scans).
  if (/\b§\s*19\s*\(\s*2\s*\)|§\s*19\s*abs\.?\s*2\b/i.test(text)) {
    return "ANBAUBESTAETIGUNG";
  }
  if (/\bteilegutachten\b|\b§\s*19\s*abs\.?\s*3\b/i.test(text)) {
    return "TEILEGUTACHTEN";
  }
  if (/\b§\s*21\b|\beinzelabnahme\b|\beinzelbetriebserlaubnis\b/i.test(text)) {
    return "EINZELABNAHME";
  }

  const ranked = (
    Object.entries(scores).filter(
      ([subtype]) => subtype !== "SONSTIGES",
    ) as Array<[GutachtenDocumentSubtype, number]>
  ).sort((a, b) => b[1] - a[1]);

  const [bestTextSubtype, bestTextScore] = ranked[0] ?? ["SONSTIGES", 0];
  const llmScore = scores[input.llmSubtype] ?? 0;

  if (input.llmSubtype === "SONSTIGES" && bestTextScore >= 5) {
    return bestTextSubtype;
  }

  if (bestTextScore >= 9 && bestTextScore >= llmScore + 4) {
    return bestTextSubtype;
  }

  if (input.llmSubtype !== "SONSTIGES") {
    return input.llmSubtype;
  }

  if (bestTextScore >= 4) {
    return bestTextSubtype;
  }

  return "SONSTIGES";
}

export function resolveGutachtenExtractionSubtype(
  extraction: GutachtenExtraction,
  fields: InvoiceTextParseResult,
  rawText?: string | null,
): GutachtenExtraction {
  const documentSubtype = resolveGutachtenDocumentSubtype({
    llmSubtype: extraction.documentSubtype,
    extraction,
    fields,
    rawText,
  });

  if (documentSubtype === extraction.documentSubtype) {
    return extraction;
  }

  return { ...extraction, documentSubtype };
}

/** @deprecated Use resolveGutachtenDocumentSubtype */
export function inferGutachtenSubtypeFromText(
  text: string,
): GutachtenDocumentSubtype | null {
  const scores = scoreGutachtenDocumentSubtypes(text);
  const ranked = (
    Object.entries(scores).filter(
      ([subtype]) => subtype !== "SONSTIGES",
    ) as Array<[GutachtenDocumentSubtype, number]>
  ).sort((a, b) => b[1] - a[1]);
  const [best, score] = ranked[0] ?? ["SONSTIGES", 0];
  return score >= 4 ? best : null;
}
