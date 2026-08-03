/**
 * Score-based invoice category inference.
 * Especially separates TÜV/HU Prüfungen from Reparatur-Rechnungen.
 */

import type { InvoiceTextParseCategory } from "./text-parse-schema";

type WeightedPattern = {
  pattern: RegExp;
  weight: number;
};

/** Strong signals for official inspection / Prüfbericht invoices. */
const TUEV_PATTERNS: WeightedPattern[] = [
  { pattern: /\bhauptuntersuchung\b/i, weight: 6 },
  { pattern: /\buntersuchungsbericht\b/i, weight: 6 },
  { pattern: /\bprüfbericht\b|\bpruefbericht\b/i, weight: 6 },
  { pattern: /\b§\s*29\b|\bstvzo\b/i, weight: 5 },
  { pattern: /\bhu\s*\/\s*au\b|\bau\s*\/\s*hu\b/i, weight: 5 },
  { pattern: /\bhu\b.{0,12}\bau\b|\bau\b.{0,12}\bhu\b/i, weight: 5 },
  { pattern: /\babgasuntersuchung\b/i, weight: 5 },
  { pattern: /\bprüfplakette\b|\bpruefplakette\b|\bhu-?plakette\b/i, weight: 4 },
  { pattern: /\bsicherheitsprüfung\b|\bsicherheitspruefung\b|\bspo\b/i, weight: 4 },
  {
    pattern:
      /\bt[üu]v\s*(s[üu]d|nord|rheinland|hessen|th[üu]ringen)?\b|\bdekra\b|\bk[üu]s\b|\bgt[üu]\b|\bgtue\b/i,
    weight: 4,
  },
  { pattern: /\bprüfstelle\b|\bpruefstelle\b|\bprüfingenieur\b|\bpruefingenieur\b/i, weight: 4 },
  { pattern: /\bperiodische\s+untersuchung\b/i, weight: 4 },
  { pattern: /\bmängelbericht\b|\bmaengelbericht\b|\bohne\s+mängel\b/i, weight: 3 },
  { pattern: /\buntersucht\s+am\b|\bnächste\s+hu\b|\bnaechste\s+hu\b/i, weight: 3 },
  { pattern: /\bt[üu]v\b/i, weight: 2 },
  { pattern: /(?:^|[^\p{L}])hu(?:[^\p{L}]|$)/iu, weight: 1 },
];

/** Workshop repair / Schaden / Instandsetzung — not routine inspection. */
const REPAIR_PATTERNS: WeightedPattern[] = [
  { pattern: /\bunfallreparatur\b|\bunfallschaden\b|\bkarosserieschaden\b/i, weight: 6 },
  { pattern: /\binstandsetzung\b/i, weight: 5 },
  { pattern: /\breparatur\b|\brepariert\b/i, weight: 4 },
  { pattern: /\bschadenbehebung\b|\bschadensbehebung\b/i, weight: 4 },
  { pattern: /\blackierung\b|\bsmart\s*repair\b|\bausbeulen\b/i, weight: 4 },
  {
    pattern:
      /\b(getriebe|kupplung|motor|turbolader|katalysator|auspuff|fahrwerk|sto[sß]dämpfer|bremsen?)\s*(reparatur|tausch|wechseln|instand)/i,
    weight: 4,
  },
  { pattern: /\baustausch\b|\bernennung\b|\bersatzteil/i, weight: 2 },
  { pattern: /\bdefekt\b|\bschaden\b|\bgebrochen\b|\blickage\b/i, weight: 2 },
  { pattern: /\bschweissen\b|\bschweißen\b|\brichten\b/i, weight: 3 },
];

const TUNING_PATTERNS: WeightedPattern[] = [
  { pattern: /\btuning\b|\bremap\b|\bstage\s*[1-3]\b/i, weight: 5 },
  { pattern: /\bdownpipe\b|\bintercooler\b|\bchiptuning\b|\bdsg\s*tune\b/i, weight: 4 },
  { pattern: /\bsportauspuff\b|\bfahrwerksfeder\b|\bgewindefahrwerk\b/i, weight: 3 },
];

const ABE_PATTERNS: WeightedPattern[] = [
  { pattern: /\ballgemeine\s+betriebserlaubnis\b|\bteilegutachten\b/i, weight: 7 },
  { pattern: /\babe\b|\b§\s*22\b|\b§\s*19\b/i, weight: 5 },
  { pattern: /\bkba\b|\babe[-\s]?nr/i, weight: 4 },
  { pattern: /\bgutachten\b.*\bteil|\bauflage[n]?\b.*\beinbau/i, weight: 3 },
];

const SERVICE_PATTERNS: WeightedPattern[] = [
  { pattern: /\bölwechsel\b|\boelwechsel\b|\böl\s*&\s*filter\b/i, weight: 5 },
  { pattern: /\binspektion\b|\bwartung\b|\bservice\b/i, weight: 3 },
  { pattern: /\bfilterwechsel\b|\breifenwechsel\b|\brädereinlagerung\b/i, weight: 3 },
  { pattern: /\binspektion\s*plus\b|\bklein[es]?\s*service\b|\bgro[sß][es]?\s*service\b/i, weight: 3 },
];

function scorePatterns(text: string, patterns: WeightedPattern[]): number {
  let score = 0;
  for (const { pattern, weight } of patterns) {
    if (pattern.test(text)) score += weight;
  }
  return score;
}

/**
 * Classify invoice text into app categories.
 * TÜV vs Reparatur: inspection language wins when both appear weakly;
 * strong repair language can still win against a lone "TÜV" brand mention.
 */
export function inferInvoiceCategory(text: string): InvoiceTextParseCategory {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "other";

  const tuev = scorePatterns(normalized, TUEV_PATTERNS);
  const repair = scorePatterns(normalized, REPAIR_PATTERNS);
  const tuning = scorePatterns(normalized, TUNING_PATTERNS);
  const service = scorePatterns(normalized, SERVICE_PATTERNS);
  const abe = scorePatterns(normalized, ABE_PATTERNS);

  if (abe >= 4) return "abe";

  // Explicit head-to-head: Prüfbericht / HU+AU beats generic "Reparatur" noise.
  if (tuev >= 4 && tuev >= repair) {
    return "tuev";
  }
  if (repair >= 4 && repair > tuev) {
    return "repair";
  }
  if (tuev > 0 && repair > 0) {
    return tuev >= repair ? "tuev" : "repair";
  }
  if (tuev >= 2) return "tuev";
  if (repair >= 2) return "repair";
  if (abe >= 2) return "abe";

  const ranked = (
    [
      { category: "abe", score: abe },
      { category: "tuning", score: tuning },
      { category: "service", score: service },
      { category: "tuev", score: tuev },
      { category: "repair", score: repair },
    ] as Array<{ category: InvoiceTextParseCategory; score: number }>
  ).sort((a, b) => b.score - a.score);

  if (ranked[0].score >= 2) {
    return ranked[0].category;
  }

  return "other";
}
