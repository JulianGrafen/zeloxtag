/**
 * Score-based invoice category inference.
 * Especially separates TÜV/HU Prüfungen from Reparatur-Rechnungen,
 * and prevents parts invoices (with incidental "ABE"/"§19") from becoming ABE.
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
  { pattern: /\bsportauspuff\b|\bfahrwerksfeder\b|\bgewindefahrwerk\b|\bsportfedern?\b/i, weight: 3 },
  { pattern: /\bfelgen?\b|\bleichtmetallr/i, weight: 2 },
];

/** Strong ABE document signals only — not incidental "inkl. ABE" on invoices. */
const ABE_STRONG_PATTERNS: WeightedPattern[] = [
  { pattern: /\ballgemeine\s+betriebserlaubnis\b/i, weight: 8 },
  { pattern: /\bteilegutachten\b/i, weight: 8 },
  { pattern: /\bgutachten\s+nach\s+§\s*19\b/i, weight: 7 },
  { pattern: /\bverwendungsbereich\b/i, weight: 5 },
  { pattern: /\bherstellerzeichen\b/i, weight: 4 },
  { pattern: /\bbetriebserlaubnis\b/i, weight: 4 },
];

/** Weak ABE mentions that often appear on parts invoices. */
const ABE_WEAK_PATTERNS: WeightedPattern[] = [
  { pattern: /(?:^|[^A-Za-z0-9_])abe(?:[^A-Za-z0-9_]|$)/i, weight: 2 },
  { pattern: /\b§\s*22\b|\b§\s*19\b/i, weight: 2 },
  { pattern: /(?:^|[^A-Za-z0-9_])kba(?:[^A-Za-z0-9_]|$)/i, weight: 2 },
  { pattern: /\babe[-\s]?nr/i, weight: 2 },
  { pattern: /\bauflage[n]?\b/i, weight: 1 },
];

const SERVICE_PATTERNS: WeightedPattern[] = [
  {
    pattern:
      /öl[-\s]*wechsel|oel[-\s]*wechsel|ol[-\s]*wechsel|ölwechselpauschale|öl[-\s]*(?:und|&|\/)\s*filter|motoröl|ölfilter/i,
    weight: 5,
  },
  { pattern: /\binspektion\b|\bwartung\b|\bservice\b/i, weight: 3 },
  {
    pattern:
      /(?:^|[^A-Za-z0-9_])(?:filterwechsel|reifenwechsel|rädereinlagerung|raedereinlagerung)(?:[^A-Za-z0-9_]|$)/i,
    weight: 3,
  },
  { pattern: /\binspektion\s*plus\b|\bklein[es]?\s*service\b|\bgro[sß][es]?\s*service\b/i, weight: 3 },
];

/** Commercial invoice signals — veto weak ABE classification. */
const INVOICE_PATTERNS: WeightedPattern[] = [
  { pattern: /\brechnung\b|\binvoice\b|\bquittung\b/i, weight: 6 },
  { pattern: /\brechnungs(?:nr|nummer)|beleg(?:nr|nummer)|re[-\s]?\d{2,}/i, weight: 5 },
  { pattern: /\bmwst\b|\bumssatzsteuer\b|\bm\.?\s*w\.?\s*st\.?\b/i, weight: 5 },
  { pattern: /\bnetto(?:betrag)?\b|\bbrutto(?:betrag)?\b|\brechnungsbetrag\b|\bzahlbetrag\b/i, weight: 4 },
  { pattern: /\beinzelpreis\b|\bgesamtpreis\b|\bpositions(?:preis|betrag)\b/i, weight: 3 },
  { pattern: /\barbeitslohn\b|\bwerkstatt\b|\bkunde(?:nnummer)?\b/i, weight: 2 },
  { pattern: /\b\d{1,3}(?:\.\d{3})*,\d{2}\s*€/i, weight: 2 },
];

function scorePatterns(text: string, patterns: WeightedPattern[]): number {
  let score = 0;
  for (const { pattern, weight } of patterns) {
    if (pattern.test(text)) score += weight;
  }
  return score;
}

function looksLikeCommercialInvoice(text: string, invoiceScore: number): boolean {
  if (invoiceScore >= 5) return true;
  // Multiple money amounts typical for position lists.
  const moneyHits = text.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) ?? [];
  if (moneyHits.length >= 3 && invoiceScore >= 2) return true;
  return false;
}

/**
 * Classify invoice text into app categories.
 * TÜV vs Reparatur: inspection language wins when both appear weakly;
 * strong repair language can still win against a lone "TÜV" brand mention.
 * ABE requires a real gutachten document — not "inkl. ABE" on a parts bill.
 */
export function inferInvoiceCategory(text: string): InvoiceTextParseCategory {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "other";

  const tuev = scorePatterns(normalized, TUEV_PATTERNS);
  const repair = scorePatterns(normalized, REPAIR_PATTERNS);
  const tuning = scorePatterns(normalized, TUNING_PATTERNS);
  const service = scorePatterns(normalized, SERVICE_PATTERNS);
  const abeStrong = scorePatterns(normalized, ABE_STRONG_PATTERNS);
  const abeWeak = scorePatterns(normalized, ABE_WEAK_PATTERNS);
  const invoice = scorePatterns(normalized, INVOICE_PATTERNS);
  const isInvoice = looksLikeCommercialInvoice(normalized, invoice);

  // Real ABE/Teilegutachten document — only if not clearly a commercial invoice.
  if (abeStrong >= 5 && !isInvoice) {
    return "abe";
  }
  // Strong gutachten + weak invoice noise (e.g. a stamp) can still be ABE.
  if (abeStrong >= 8 && invoice < 6) {
    return "abe";
  }
  // Weak "ABE"/"§19"/"KBA" alone must NEVER classify a Rechnung as ABE.
  if (isInvoice || invoice >= 4) {
    // fall through to invoice categories
  } else if (abeStrong + abeWeak >= 6 && abeStrong >= 4) {
    return "abe";
  }

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

  const ranked = (
    [
      { category: "tuning", score: tuning },
      { category: "service", score: service },
      { category: "tuev", score: tuev },
      { category: "repair", score: repair },
      // ABE only competes when strong signals exist and invoice is weak.
      {
        category: "abe",
        score:
          isInvoice || invoice >= 4
            ? 0
            : abeStrong >= 4
              ? abeStrong + Math.min(abeWeak, 2)
              : 0,
      },
    ] as Array<{ category: InvoiceTextParseCategory; score: number }>
  ).sort((a, b) => b.score - a.score);

  if (ranked[0].score >= 2) {
    return ranked[0].category;
  }

  // Commercial bill without a clear specialty → other (invoice), never ABE.
  if (isInvoice) return "other";

  return "other";
}
