/**
 * Score OCR text to pick ABE / Teilegutachten / Einzelabnahme / EG-BE / TÜV.
 * Used before subtype extraction into `approval_fields`.
 */

import type { ApprovalFieldKind } from "@/lib/documents/approval-fields";

type WeightedPattern = {
  pattern: RegExp;
  weight: number;
};

const PRUEFUNG192: WeightedPattern[] = [
  { pattern: /\b§\s*19\s*\(\s*2\s*\)/i, weight: 12 },
  { pattern: /\bprüfung\s+nach\s+§\s*19/i, weight: 10 },
  { pattern: /\buntersuchungsbericht\b/i, weight: 4 },
  { pattern: /\bgutachten\s+zur\s+erlangung\s+der\s+betriebserlaubnis\b/i, weight: 9 },
  { pattern: /\baufstellung\s+der\s+technischen\s+vorschriften\b/i, weight: 7 },
];

const EINZELABNAHME: WeightedPattern[] = [
  { pattern: /\beinzelabnahme\b/i, weight: 10 },
  { pattern: /\bänderungsabnahme\b|\baenderungsabnahme\b/i, weight: 9 },
  { pattern: /\b§\s*21\b/i, weight: 6 },
  { pattern: /\bfeld\s*22\b|\bziffer\s*22\b/i, weight: 7 },
  { pattern: /\bamtlich\s+anerkannter\s+sachverständiger\b/i, weight: 5 },
];

const TEILEGUTACHTEN: WeightedPattern[] = [
  { pattern: /\bteilegutachten\b/i, weight: 10 },
  { pattern: /\b§\s*19\s*abs\.?\s*3\b/i, weight: 8 },
  { pattern: /\bverwendungsbereich\b/i, weight: 4 },
  { pattern: /\bsofortige\s+abnahme\b|\babnahme\s+erforderlich\b/i, weight: 3 },
];

const EGBE: WeightedPattern[] = [
  { pattern: /\beg[-\s]?betriebserlaubnis\b|\beg[-\s]?typgenehmigung\b/i, weight: 8 },
  { pattern: /\bece[-\s]?r\b|\bece\s+regelung\b/i, weight: 6 },
  { pattern: /\be[-\s]?prüfzeichen\b|\be[-\s]?pruefzeichen\b/i, weight: 7 },
  { pattern: /\be\d+\s*\*/i, weight: 8 },
  { pattern: /\bbauteilgruppe\b/i, weight: 3 },
];

const ABE: WeightedPattern[] = [
  { pattern: /\ballgemeine\s+betriebserlaubnis\b/i, weight: 10 },
  { pattern: /\bkba\s*\d{5}\b/i, weight: 7 },
  { pattern: /(?:^|[^A-Za-z0-9_])abe(?:[^A-Za-z0-9_]|$)/i, weight: 3 },
];

const TUEV: WeightedPattern[] = [
  { pattern: /\bhauptuntersuchung\b/i, weight: 8 },
  { pattern: /\buntersuchungsbericht\b/i, weight: 8 },
  { pattern: /\bhu\s*[\/+]\s*au\b/i, weight: 7 },
  { pattern: /\b§\s*29\b/i, weight: 6 },
  { pattern: /\bprüfplakette\b|\bpruefplakette\b/i, weight: 5 },
];

function score(text: string, patterns: WeightedPattern[]): number {
  let total = 0;
  for (const { pattern, weight } of patterns) {
    if (pattern.test(text)) total += weight;
  }
  return total;
}

/**
 * Best-effort approval subtype from OCR text.
 * Defaults to classic `abe` for gutachten-family documents.
 */
export function detectApprovalKind(text: string): ApprovalFieldKind {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "abe";

  const scores: Record<ApprovalFieldKind, number> = {
    gutachten: Math.max(
      score(normalized, TEILEGUTACHTEN),
      score(normalized, EINZELABNAHME),
      score(normalized, PRUEFUNG192),
    ),
    pruefung192: score(normalized, PRUEFUNG192),
    einzelabnahme: score(normalized, EINZELABNAHME),
    teilegutachten: score(normalized, TEILEGUTACHTEN),
    egbe: score(normalized, EGBE),
    tuev: score(normalized, TUEV),
    abe: score(normalized, ABE),
  };

  const ranked = (
    Object.entries(scores) as Array<[ApprovalFieldKind, number]>
  ).sort((a, b) => b[1] - a[1]);

  const [bestKind, bestScore] = ranked[0]!;
  if (bestScore < 6) return "abe";

  // Prefer specific gutachten types over bare ABE when close.
  if (
    bestKind === "abe" &&
    ranked[1] &&
    ranked[1][1] >= 6 &&
    ranked[1][0] !== "tuev"
  ) {
    return ranked[1][0];
  }

  return bestKind;
}
