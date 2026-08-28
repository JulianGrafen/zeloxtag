/**
 * DMS / Werkstatt-Rechnungen mit Abschnitten:
 * Arbeitswerte/Arbeitszeit | Ersatzteile/Material | Sonstige Kosten/Fremdleistungen.
 */

import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";
import { isJunkInvoiceLineLabel } from "@/lib/ocr/invoice-line-item-dedupe";
import {
  extractNetSumFromText,
  INVOICE_NET_TOTAL_TOLERANCE_EUR,
} from "@/lib/ocr/invoice-footer-totals";
import { isContinuationInvoiceLabel } from "@/lib/ocr/invoice-line-item-alignment";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";

const MAX_ITEMS = 60;
const MAX_LABEL = 160;

const MONEY = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/;

type WorkshopSection = "labor" | "parts" | "other" | "none";

const SECTION_LABOR = /^(?:arbeits\s*werte|arbeitszeit|lohnarbeiten)\b/i;
const SECTION_PARTS = /^(?:ersatz\s*teile|material(?:ien)?)\b/i;
const SECTION_OTHER =
  /^(?:sonstige\s+kosten|fremdleistungen?|nebenkosten)\b/i;
const SECTION_STOP =
  /^(?:zwischensummen|endsummen|netto\s+summe|positionssumme|zahlbar|endsumme)\b/i;

const SKIP_LINE =
  /^(?:beschreibung|rab\.?\s*%|art\.?|pg\.?|std\.?|preis|einzelpreis|mechanik|ersatzteile|material(?:ien)?|sonstige\s+kosten|fremdleistungen?|nebenkosten|arbeitszeit|lohnarbeiten|positionssumme|netto|mwst|endpreis|endsummen|zahlbar)\b/i;

const AMOUNT_ONLY_LINE =
  /^\s*(?:€|eur)?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})(?:\s*(?:€|eur))?\s*$/i;

/** Art/PG column (1–9) printed on its own OCR line. */
const WORKSHOP_ART_PG_TOKEN = /^[1-9]$/;

/** Unit cell between Std/Einzelpreis and Preis-€. */
const WORKSHOP_UNIT_TOKEN = /^(?:std\.?|stück|stk\.?|€|eur)$/i;

function cleanLabel(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*(?:€|eur)\s*$/i, "")
    .trim()
    .slice(0, MAX_LABEL);
}

function parseMoney(raw: string): number | null {
  return parseGermanMoneyAmount(raw);
}

function hasSectionHeaders(text: string): boolean {
  const lines = text.split("\n").map((line) => line.trim());
  const hasLabor = lines.some((line) => SECTION_LABOR.test(line));
  const hasParts = lines.some((line) => SECTION_PARTS.test(line));
  const hasOther = lines.some((line) => SECTION_OTHER.test(line));
  // Also match section headers embedded in longer OCR lines.
  const blob = text.toLowerCase();
  const laborInBlob =
    /\barbeits\s*werte\b|\barbeitszeit\b|\blohnarbeiten\b/.test(blob);
  const partsInBlob = /\bersatz\s*teile\b|\bmaterial(?:ien)?\b/.test(blob);
  const otherInBlob =
    /\bsonstige\s+kosten\b|\bfremdleistungen?\b|\bnebenkosten\b/.test(blob);
  return (
    (hasLabor || laborInBlob) &&
    (hasParts || hasOther || partsInBlob || otherInBlob)
  );
}

function trailingMoneyValues(line: string): number[] {
  const values: number[] = [];
  for (const match of line.matchAll(new RegExp(MONEY.source, "g"))) {
    const parsed = parseMoney(match[1] ?? "");
    if (parsed != null) values.push(parsed);
  }
  return values;
}

/** Strip Art/PG/Std columns from labor lines — keep description + line total. */
function parseLaborLine(line: string): { label: string; amount: number } | null {
  const amounts = trailingMoneyValues(line);
  if (amounts.length === 0) return null;

  const total = amounts[amounts.length - 1]!;
  if (total <= 0) return null;

  let labelPart = line;
  for (const match of [...line.matchAll(new RegExp(MONEY.source, "g"))].reverse()) {
    labelPart = line.slice(0, match.index ?? 0);
  }

  labelPart = labelPart
    .replace(/\s+\d+\s+(?:\d+[.,]\d{1,2}\s*)?(?:Std\.?)?\s*$/i, "")
    .replace(/\s+\d+[.,]\d{1,2}\s*(?:Std\.?)?\s*$/i, "")
    .replace(/\s+\d+\s*$/i, "")
    .trim();

  const label = cleanLabel(labelPart);
  if (label.length < 4 || SKIP_LINE.test(label)) return null;
  if (!/[a-zäöüß]{3,}/i.test(label)) return null;

  return { label, amount: total };
}

/** "1 Stück Wasserschlauch …" or "1 Sensor, Kühlmitteltemperatur …" */
function parsePartsLine(line: string): { label: string; amount: number } | null {
  const qtyMatch = line.match(/^(\d+)\s*(?:Stück|Stk\.?)?\s+/i);
  if (!qtyMatch) return null;

  const amounts = trailingMoneyValues(line);
  if (amounts.length === 0) return null;
  const total = amounts[amounts.length - 1]!;

  const afterQty = line.slice(qtyMatch[0].length);
  let labelPart = afterQty;
  const firstMoney = afterQty.search(new RegExp(MONEY.source));
  if (firstMoney >= 0) {
    labelPart = afterQty.slice(0, firstMoney);
  }

  const label = cleanLabel(labelPart);
  if (label.length < 2) return null;

  return { label, amount: total };
}

/** "1 Fracht 5,00 5,00" under Sonstige Kosten. */
function parseOtherLine(line: string): { label: string; amount: number } | null {
  const qtyMatch = line.match(/^(\d+)\s+/);
  if (!qtyMatch) return null;

  const amounts = trailingMoneyValues(line);
  if (amounts.length === 0) return null;
  const total = amounts[amounts.length - 1]!;

  const afterQty = line.slice(qtyMatch[0].length);
  let labelPart = afterQty;
  const firstMoney = afterQty.search(new RegExp(MONEY.source));
  if (firstMoney >= 0) {
    labelPart = afterQty.slice(0, firstMoney);
  }

  const label = cleanLabel(labelPart);
  if (label.length < 2 || SKIP_LINE.test(label)) return null;

  return { label, amount: total };
}

function detectSection(line: string, current: WorkshopSection): WorkshopSection {
  if (SECTION_LABOR.test(line) || /\barbeits\s*werte\b/i.test(line)) return "labor";
  if (SECTION_PARTS.test(line) || /\bersatz\s*teile\b/i.test(line)) return "parts";
  if (
    SECTION_OTHER.test(line) ||
    /\bsonstige\s+kosten\b|\bfremdleistungen?\b/i.test(line)
  ) {
    return "other";
  }
  if (SECTION_STOP.test(line)) return "none";
  return current;
}

/** Infer section from a data line when headers are missing or glued. */
function inferSectionFromLine(line: string): WorkshopSection | null {
  if (/\bfracht\b/i.test(line)) return "other";
  if (/\bstück\b|\bstk\.?\b/i.test(line)) return "parts";
  if (/\bstd\.?\b/i.test(line) || /\d+[.,]\d{1,2}\s*(?:std)/i.test(line)) {
    return "labor";
  }
  if (/^\d+\s+[A-Za-zÄÖÜäöüß]/.test(line) && !/\bstd\.?\b/i.test(line)) {
    return "parts";
  }
  return null;
}

function lineHasMoney(line: string): boolean {
  return trailingMoneyValues(line).length > 0;
}

/** Short wrap fragment (Blau/Rot) — not a diagnostic sentence. */
function isWorkshopWrapFragment(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || lineHasMoney(trimmed)) return false;
  if (WORKSHOP_ART_PG_TOKEN.test(trimmed) || WORKSHOP_UNIT_TOKEN.test(trimmed)) {
    return false;
  }
  if (/^\d+$/.test(trimmed) || /^\d+\s/.test(trimmed)) return false;
  if (SKIP_LINE.test(trimmed) || SECTION_STOP.test(trimmed)) return false;
  if (isContinuationInvoiceLabel(trimmed)) return true;
  if (trimmed.length <= 24 && !/\s/.test(trimmed)) return true;
  if (
    trimmed.length <= 24 &&
    /^[A-ZÄÖÜa-zäöüß0-9]+(?:[\/\-][A-ZÄÖÜa-zäöüß0-9]+)+$/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

/**
 * Join description + Preis-€. Camera OCR often prints Art, Std/Einzelpreis, and
 * Preis-€ on separate lines — keep the last amount in that run (rightmost column).
 */
export function prejoinWorkshopSectionLines(rawText: string): string {
  const lines = rawText.split("\n");
  const joined: string[] = [];
  let pending: string | null = null;
  let amountRun: string[] = [];

  const flushPending = () => {
    if (pending) {
      if (amountRun.length > 0) {
        joined.push(`${pending} ${amountRun[amountRun.length - 1]}`);
      } else {
        joined.push(pending);
      }
    } else if (amountRun.length > 0) {
      joined.push(amountRun[amountRun.length - 1]!);
    }
    pending = null;
    amountRun = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;

    if (WORKSHOP_UNIT_TOKEN.test(line)) {
      continue;
    }
    if (WORKSHOP_ART_PG_TOKEN.test(line) && pending) {
      continue;
    }

    if (
      SECTION_LABOR.test(line) ||
      SECTION_PARTS.test(line) ||
      SECTION_OTHER.test(line) ||
      SECTION_STOP.test(line) ||
      SKIP_LINE.test(line)
    ) {
      flushPending();
      joined.push(line);
      continue;
    }

    if (AMOUNT_ONLY_LINE.test(line)) {
      amountRun.push(line);
      continue;
    }

    if (lineHasMoney(line)) {
      if (pending && isWorkshopWrapFragment(pending) && amountRun.length === 0) {
        joined.push(`${pending} ${line}`);
        pending = null;
        amountRun = [];
      } else {
        flushPending();
        joined.push(line);
      }
      continue;
    }

    if (pending) {
      if (isWorkshopWrapFragment(line)) {
        pending = `${pending} ${line}`;
        continue;
      }
      flushPending();
      pending = line;
      continue;
    }

    pending = line;
  }

  flushPending();
  return joined.join("\n");
}

/** Score partial DMS/workshop signals when section headers are split across OCR lines. */
export function detectWorkshopInvoiceSignals(rawText: string): number {
  const lower = rawText.replace(/\r\n/g, "\n").toLowerCase();
  let score = 0;
  if (/\barbeits\s*werte\b|\barbeitszeit\b|\blohnarbeiten\b/.test(lower)) {
    score += 3;
  }
  if (/\bersatz\s*teile\b|\bmaterial(?:ien)?\b/.test(lower)) score += 2;
  if (/\bsonstige\s+kosten\b|\bfremdleistungen?\b|\bnebenkosten\b/.test(lower)) {
    score += 2;
  }
  if (/\bpreis-?\s*€\b/.test(lower)) score += 2;
  if (/\bendsummen\b/.test(lower)) score += 2;
  if (/\bpositionssumme\b/.test(lower)) score += 2;
  if (/\bnetto\s+summe\b/.test(lower)) score += 1;
  if (/\bendpreis\b/.test(lower)) score += 1;
  if (/\bmechanik\b/.test(lower) && /\bstd\b/.test(lower)) score += 1;
  return score;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumItems(items: InvoiceLineItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
}

/** Net total from Positionssumme / Netto Summe / Nettosumme (excludes MwSt). */
export function extractWorkshopNetSum(rawText: string): number | null {
  return extractNetSumFromText(rawText);
}

export function sanitizeWorkshopLineItems(
  items: InvoiceLineItem[] | null | undefined,
): InvoiceLineItem[] | null {
  if (!items?.length) return null;
  const cleaned = items.filter(
    (item) =>
      item.label.trim().length >= 2 &&
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      !isJunkInvoiceLineLabel(item.label) &&
      !/^(?:endpreis|endsummen|netto\s+summe|positionssumme|gesamt)\b/i.test(
        item.label.trim(),
      ),
  );
  return cleaned.length > 0 ? cleaned : null;
}

/** True when layout/LLM output is structurally unusable vs a section invoice. */
export function isGarbageWorkshopLineItems(
  items: InvoiceLineItem[],
  options?: { netSum?: number | null },
): boolean {
  if (items.length === 0) return true;

  const stückRows = items.filter((item) => /^stück$/i.test(item.label.trim()));
  if (stückRows.length >= 2) return true;

  const junkRows = items.filter((item) => isJunkInvoiceLineLabel(item.label));
  if (junkRows.length >= 2) return true;

  if (items.some((item) => /^endpreis\b|^gesamt$/i.test(item.label.trim()))) {
    return true;
  }

  if (items.some((item) => item.label.trim().length > 80)) return true;

  const netSum = options?.netSum ?? null;
  if (netSum != null && netSum > 50) {
    const hourLike = items.filter(
      (item) => item.amount > 0 && item.amount <= 3,
    ).length;
    if (hourLike >= 2) return true;
  }

  if (netSum != null && netSum > 0) {
    const sum = sumItems(items);
    const delta = Math.abs(sum - netSum);
    if (delta > Math.max(15, netSum * 0.08)) return true;
  }

  return false;
}

function netDelta(
  items: InvoiceLineItem[] | null | undefined,
  netSum: number | null,
): number | null {
  if (!items?.length || netSum == null) return null;
  return Math.abs(sumItems(items) - netSum);
}

function pickClosestToNet(
  candidates: InvoiceLineItem[][],
  netSum: number | null,
): InvoiceLineItem[] | null {
  if (candidates.length === 0) return null;
  if (netSum == null) {
    return candidates.reduce((best, items) =>
      items.length > best.length ? items : best,
    );
  }

  let best = candidates[0]!;
  let bestGap = netDelta(best, netSum) ?? Number.POSITIVE_INFINITY;
  for (const items of candidates.slice(1)) {
    const gap = netDelta(items, netSum) ?? Number.POSITIVE_INFINITY;
    if (gap + 0.005 < bestGap) {
      best = items;
      bestGap = gap;
    } else if (Math.abs(gap - bestGap) <= 0.005 && items.length > best.length) {
      best = items;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * OCR-first resolver: prefer the candidate whose sum is closest to the footer net.
 * Mega-merged LLM rows (long labels, far fewer rows than OCR, or sum mismatch)
 * lose to any priced OCR candidate.
 */
export function resolveWorkshopLineItems(options: {
  llmItems: InvoiceLineItem[] | null | undefined;
  ocrText: string;
  extraOcrItems?: InvoiceLineItem[] | null;
}): InvoiceLineItem[] | null {
  const llm = sanitizeWorkshopLineItems(options.llmItems) ?? [];
  const fromText = sanitizeWorkshopLineItems(
    extractWorkshopSectionLineItems(options.ocrText),
  );
  const extra = sanitizeWorkshopLineItems(options.extraOcrItems ?? null);
  const netSum = extractWorkshopNetSum(options.ocrText);

  const ocrCandidates = [fromText, extra].filter(
    (items): items is InvoiceLineItem[] => items != null && items.length >= 2,
  );
  const bestOcr = pickClosestToNet(ocrCandidates, netSum);

  if (
    bestOcr &&
    netSum != null &&
    (netDelta(bestOcr, netSum) ?? Number.POSITIVE_INFINITY) <=
      INVOICE_NET_TOTAL_TOLERANCE_EUR
  ) {
    return bestOcr;
  }

  if (bestOcr && netSum != null && llm.length > 0) {
    const llmGap = netDelta(llm, netSum) ?? Number.POSITIVE_INFINITY;
    const ocrGap = netDelta(bestOcr, netSum) ?? Number.POSITIVE_INFINITY;
    const ocrClose = ocrGap <= INVOICE_NET_TOTAL_TOLERANCE_EUR;
    const llmClose = llmGap <= INVOICE_NET_TOTAL_TOLERANCE_EUR;
    if (ocrClose && (!llmClose || ocrGap + 0.05 < llmGap)) return bestOcr;
  }

  const llmLooksMegaMerged =
    isGarbageWorkshopLineItems(llm, { netSum }) ||
    (bestOcr != null && bestOcr.length >= llm.length + 2);

  if (llmLooksMegaMerged && bestOcr) return bestOcr;
  if (llm.length > 0) return llm;
  return bestOcr;
}

/**
 * True when the section OCR parser reconciles with the printed net footer.
 * Format routing is ignored — any vendor with Arbeitswerte/Ersatzteile layout.
 */
export function sectionOcrMatchesFooterNet(ocrText: string): boolean {
  const ocrItems = sanitizeWorkshopLineItems(
    extractWorkshopSectionLineItems(ocrText),
  );
  const netSum = extractWorkshopNetSum(ocrText);
  return (
    ocrItems != null &&
    ocrItems.length >= 2 &&
    netSum != null &&
    Math.abs(sumItems(ocrItems) - netSum) <= INVOICE_NET_TOTAL_TOLERANCE_EUR
  );
}

/**
 * Parse section-based workshop invoices from OCR plain text.
 */
export function extractWorkshopSectionLineItems(
  rawText: string,
): InvoiceLineItem[] | null {
  const normalized = prejoinWorkshopSectionLines(rawText.replace(/\r\n/g, "\n"));
  if (!isWorkshopSectionInvoiceText(normalized) && detectWorkshopInvoiceSignals(normalized) < 3) {
    return null;
  }

  const items: InvoiceLineItem[] = [];
  const seen = new Set<string>();
  let section: WorkshopSection = "none";

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;

    const prevSection: WorkshopSection = section;
    section = detectSection(line, section);
    if (section !== prevSection) continue;

    if (
      SECTION_LABOR.test(line) ||
      SECTION_PARTS.test(line) ||
      SECTION_OTHER.test(line)
    ) {
      continue;
    }

    if (section === "none") {
      const inferred = inferSectionFromLine(line);
      if (inferred) section = inferred;
    }

    if (
      items.length > 0 &&
      isWorkshopWrapFragment(line) &&
      !lineHasMoney(line)
    ) {
      const last = items[items.length - 1]!;
      last.label = cleanLabel(`${last.label} ${line}`);
      continue;
    }

    if (section === "none") continue;
    if (SKIP_LINE.test(line)) continue;
    if (/^(?:\d+\s+)?(?:art|pg|std|preis|rab)/i.test(line)) continue;

    let parsed: { label: string; amount: number } | null = null;

    if (section === "labor") {
      parsed = parseLaborLine(line);
    } else if (section === "parts") {
      parsed = parsePartsLine(line) ?? parseLaborLine(line);
    } else if (section === "other") {
      parsed = parseOtherLine(line) ?? parsePartsLine(line);
    }

    if (!parsed || isJunkInvoiceLineLabel(parsed.label)) continue;
    if (parsed.label.length < 4 && section !== "other") continue;

    const key = `${parsed.label.toLowerCase()}|${parsed.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(parsed);

    if (items.length >= MAX_ITEMS) break;
  }

  const sanitized = sanitizeWorkshopLineItems(items);
  return sanitized != null && sanitized.length >= 2 ? sanitized : null;
}

/** Prefer Endpreis (brutto). Never treat Netto Summe as the payable document total. */
export function extractWorkshopInvoiceAmount(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");

  const endpreis = [
    ...text.matchAll(
      /endpreis\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*(?:€|eur)?/gi,
    ),
  ]
    .map((match) => parseMoney(match[1] ?? ""))
    .filter((value): value is number => value != null);

  if (endpreis.length > 0) {
    return Math.max(...endpreis);
  }

  return null;
}

export function extractWorkshopInvoiceVatAmount(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");
  for (const line of text.split("\n")) {
    if (!/\bmwst/i.test(line)) continue;
    const amounts = trailingMoneyValues(line);
    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }
  return null;
}

export function isWorkshopSectionInvoiceText(rawText: string): boolean {
  const text = rawText.replace(/\r\n/g, "\n");
  if (hasSectionHeaders(text)) return true;
  return detectWorkshopInvoiceSignals(text) >= 4;
}

function labelMatchScore(a: string, b: string): number {
  const keyA = a.toLowerCase().replace(/\s+/g, " ").trim();
  const keyB = b.toLowerCase().replace(/\s+/g, " ").trim();
  if (!keyA || !keyB) return 0;
  if (keyA === keyB) return 100;
  if (keyA.includes(keyB) || keyB.includes(keyA)) return 80;
  const wordsA = new Set(keyA.split(" ").filter((word) => word.length >= 3));
  const overlap = keyB.split(" ").filter((word) => word.length >= 3 && wordsA.has(word)).length;
  if (overlap >= 2) return 60;
  if (overlap === 1) return 35;
  return 0;
}

/**
 * Prefer LLM items; fall back to OCR section parser when LLM output is sparse or wrong sum.
 * @deprecated Prefer {@link resolveWorkshopLineItems} for production pipeline.
 */
export function preferWorkshopLineItems(
  llmItems: InvoiceLineItem[] | null | undefined,
  ocrItems: InvoiceLineItem[] | null | undefined,
): InvoiceLineItem[] | null {
  const llm = llmItems ?? [];
  const ocr = ocrItems ?? [];
  if (llm.length === 0) return ocr.length > 0 ? ocr : null;
  if (ocr.length === 0) return llm;

  const llmSum = llm.reduce((sum, item) => sum + item.amount, 0);
  const ocrSum = ocr.reduce((sum, item) => sum + item.amount, 0);

  if (llm.length < 3 && ocr.length >= 3) return ocr;
  if (ocr.length >= llm.length + 2 && Math.abs(ocrSum - llmSum) > 50) return ocr;

  return llm;
}

/** Conservative reconcile — only fix amounts when OCR section parser matches label. */
export function reconcileWorkshopLineItemsWithOcrText(
  items: InvoiceLineItem[] | null | undefined,
  rawText: string,
): InvoiceLineItem[] | null {
  if (!items?.length || !rawText.trim()) return items ?? null;

  const ocrItems = extractWorkshopSectionLineItems(rawText);
  if (!ocrItems?.length) return items;

  return items.map((item) => {
    let best: InvoiceLineItem | null = null;
    let bestScore = 0;
    for (const ocrItem of ocrItems) {
      const score = labelMatchScore(item.label, ocrItem.label);
      if (score > bestScore) {
        bestScore = score;
        best = ocrItem;
      }
    }
    if (!best || bestScore < 50) return item;
    if (Math.abs(best.amount - item.amount) < 0.011) return item;
    return { ...item, amount: best.amount };
  });
}
