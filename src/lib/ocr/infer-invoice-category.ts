/**
 * Score-based invoice category inference.
 * Separates real HU/AU Prüfberichte from Werkstatt-Rechnungen that merely
 * mention TÜV/DEKRA (brand, “inkl. TÜV-Abnahme”, etc.).
 */

import type { InvoiceTextParseCategory } from "./text-parse-schema";

type WeightedPattern = {
  pattern: RegExp;
  weight: number;
};

/**
 * Strong signals that the document itself IS a HU/AU / Prüfbericht.
 * Brand names alone are NOT enough.
 */
const TUEV_STRONG_PATTERNS: WeightedPattern[] = [
  { pattern: /\bhauptuntersuchung\b/i, weight: 8 },
  { pattern: /\buntersuchungsbericht\b/i, weight: 8 },
  { pattern: /\bprüfbericht\b|\bpruefbericht\b/i, weight: 7 },
  { pattern: /\bhu\s*[\/+]\s*au\b|\bau\s*[\/+]\s*hu\b/i, weight: 7 },
  { pattern: /\bhu\s*und\s*au\b|\bau\s*und\s*hu\b/i, weight: 7 },
  { pattern: /\babgasuntersuchung\b/i, weight: 6 },
  { pattern: /\b§\s*29\b/i, weight: 6 },
  { pattern: /\bprüfplakette\b|\bpruefplakette\b|\bhu-?plakette\b/i, weight: 5 },
  { pattern: /\bperiodische\s+untersuchung\b/i, weight: 5 },
  { pattern: /\bmängelbericht\b|\bmaengelbericht\b/i, weight: 4 },
  { pattern: /\bohne\s+(?:erhebliche\s+)?mängel\b|\bohne\s+maengel\b/i, weight: 4 },
  { pattern: /\bnächste\s+hu\b|\bnaechste\s+hu\b|\bhu\s+fällig\b/i, weight: 4 },
  { pattern: /\buntersucht\s+am\b|\buntersuchungstag\b/i, weight: 3 },
  { pattern: /\bprüfingenieur\b|\bpruefingenieur\b|\bprüfstelle\b|\bpruefstelle\b/i, weight: 3 },
];

/**
 * Weak / incidental signals — common on Werkstattrechnungen.
 * Must not classify a commercial invoice as TÜV by themselves.
 */
const TUEV_WEAK_PATTERNS: WeightedPattern[] = [
  {
    pattern:
      /\bt[üu]v\s*(?:s[üu]d|nord|rheinland|hessen|th[üu]ringen)?\b|\bdekra\b|\bk[üu]s\b|\bgt[üu]\b|\bgtue\b/i,
    weight: 2,
  },
  { pattern: /\bt[üu]v[-\s]?(?:abnahme|eintragung|termin|bereit|fähig|faehig)\b/i, weight: 2 },
  { pattern: /\binkl\.?\s*t[üu]v\b|\bmit\s*t[üu]v\b/i, weight: 1 },
  { pattern: /\bsicherheitsprüfung\b|\bsicherheitspruefung\b/i, weight: 2 },
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

/** Commercial invoice signals — veto weak TÜV / ABE classification. */
const INVOICE_PATTERNS: WeightedPattern[] = [
  { pattern: /\brechnung\b|\binvoice\b|\bquittung\b|\bkassenbon\b/i, weight: 6 },
  { pattern: /\brechnungs(?:nr|nummer)|beleg(?:nr|nummer)|re[-\s]?\d{2,}/i, weight: 5 },
  { pattern: /\bmwst\b|\bumssatzsteuer\b|\bm\.?\s*w\.?\s*st\.?\b/i, weight: 5 },
  { pattern: /\bnetto(?:betrag)?\b|\bbrutto(?:betrag)?\b|\brechnungsbetrag\b|\bzahlbetrag\b/i, weight: 4 },
  { pattern: /\beinzelpreis\b|\bgesamtpreis\b|\bpositions(?:preis|betrag)\b/i, weight: 3 },
  { pattern: /\barbeitslohn\b|\bwerkstatt\b|\bkunde(?:nnummer)?\b/i, weight: 2 },
  { pattern: /\b\d{1,3}(?:\.\d{3})*,\d{2}\s*€/i, weight: 2 },
  { pattern: /\bposition(?:en)?\b|\bartikel\b|\bmenge\b/i, weight: 1 },
];

function scorePatterns(text: string, patterns: WeightedPattern[]): number {
  let score = 0;
  for (const { pattern, weight } of patterns) {
    if (pattern.test(text)) score += weight;
  }
  return score;
}

export function looksLikeCommercialInvoice(
  text: string,
  invoiceScore?: number,
): boolean {
  const score =
    invoiceScore ?? scorePatterns(text.replace(/\s+/g, " ").trim(), INVOICE_PATTERNS);
  if (score >= 5) return true;
  const moneyHits = text.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) ?? [];
  if (moneyHits.length >= 3 && score >= 2) return true;
  if (moneyHits.length >= 2 && score >= 4) return true;
  return false;
}

/** True when the document is a real HU/AU Prüfbericht, not a workshop bill. */
export function hasStrongTuevEvidence(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  return scorePatterns(normalized, TUEV_STRONG_PATTERNS) >= 6;
}

function pickBestSpecialty(scores: {
  tuning: number;
  service: number;
  repair: number;
}): InvoiceTextParseCategory | null {
  const ranked = [
    { category: "tuning" as const, score: scores.tuning },
    { category: "service" as const, score: scores.service },
    { category: "repair" as const, score: scores.repair },
  ].sort((a, b) => b.score - a.score);

  if (ranked[0].score >= 2) return ranked[0].category;
  return null;
}

/**
 * Classify invoice text into app categories.
 * Commercial invoices with incidental TÜV/DEKRA mentions stay service/repair/tuning/other.
 */
export function inferInvoiceCategory(text: string): InvoiceTextParseCategory {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "other";

  const tuevStrong = scorePatterns(normalized, TUEV_STRONG_PATTERNS);
  const tuevWeak = scorePatterns(normalized, TUEV_WEAK_PATTERNS);
  const repair = scorePatterns(normalized, REPAIR_PATTERNS);
  const tuning = scorePatterns(normalized, TUNING_PATTERNS);
  const service = scorePatterns(normalized, SERVICE_PATTERNS);
  const abeStrong = scorePatterns(normalized, ABE_STRONG_PATTERNS);
  const abeWeak = scorePatterns(normalized, ABE_WEAK_PATTERNS);
  const invoice = scorePatterns(normalized, INVOICE_PATTERNS);
  const isInvoice = looksLikeCommercialInvoice(normalized, invoice);
  const specialty = pickBestSpecialty({ tuning, service, repair });

  // Real ABE/Teilegutachten — never a commercial parts invoice.
  if (abeStrong >= 5 && !isInvoice) {
    return "abe";
  }
  if (abeStrong >= 8 && invoice < 6) {
    return "abe";
  }
  if (!(isInvoice || invoice >= 4) && abeStrong + abeWeak >= 6 && abeStrong >= 4) {
    return "abe";
  }

  // Real HU/AU Prüfbericht: needs strong evidence. On commercial invoices,
  // require even clearer Prüfbericht language so "TÜV-Abnahme" bills stay invoices.
  const tuevThreshold = isInvoice ? 10 : 6;
  if (tuevStrong >= tuevThreshold && tuevStrong >= repair + 2) {
    return "tuev";
  }

  // Weak TÜV/DEKRA brand noise on a Rechnung must never win.
  if (isInvoice || invoice >= 4) {
    if (specialty) return specialty;
    if (repair >= 2) return "repair";
    if (service >= 2) return "service";
    if (tuning >= 2) return "tuning";
    return "other";
  }

  // Non-invoice documents (scanned Prüfberichte without MwSt).
  if (tuevStrong >= 6) return "tuev";
  if (tuevStrong + tuevWeak >= 8 && tuevStrong >= 4) return "tuev";

  if (repair >= 4 && repair > tuevStrong) return "repair";
  if (specialty) return specialty;
  if (repair >= 2) return "repair";

  // Never let weak brand score alone (e.g. "TÜV" = 2) classify as tuev.
  if (tuevStrong >= 4) return "tuev";

  return "other";
}

/**
 * Merge LLM category with heuristics — never promote weak TÜV on Rechnungen.
 */
export function preferInvoiceCategory(
  llmCategory: InvoiceTextParseCategory,
  rawText: string,
): InvoiceTextParseCategory {
  const scored = inferInvoiceCategory(rawText);
  const isInvoice = looksLikeCommercialInvoice(rawText);
  const strongTuev = hasStrongTuevEvidence(rawText);

  // Heuristic found a clear specialty / Prüfbericht.
  if (scored === "tuev") return "tuev";
  if (scored !== "other" && scored !== "abe") {
    // Don't let LLM "tuev" override a commercial service/repair/tuning bill.
    if (llmCategory === "tuev" && isInvoice && !strongTuev) {
      return scored;
    }
    return scored;
  }

  // LLM said tuev but text is a Werkstattrechnung without Prüfbericht signals.
  if (llmCategory === "tuev" && isInvoice && !strongTuev) {
    return "other";
  }

  if (llmCategory === "abe") return "other";
  return llmCategory;
}
