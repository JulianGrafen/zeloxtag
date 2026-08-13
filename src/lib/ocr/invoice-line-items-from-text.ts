/**
 * Heuristic invoice line-item extraction from OCR text.
 * Splits material / labor / VAT into separate positions when the LLM merges them.
 */

import {
  isUnitPriceAmountOfTotal,
  isJunkInvoiceLineLabel,
  normalizedInvoiceLineLabelKey,
} from "@/lib/ocr/invoice-line-item-dedupe";
import {
  extractGrossTotalFromText,
  extractNetSumFromText,
  isInvoiceFooterSummaryLabel,
  stripNonPositionInvoiceRows,
} from "@/lib/ocr/invoice-footer-totals";
import { isPlausibleInvoiceVatAmount } from "@/lib/ocr/invoice-vat";
import { prejoinWrappedInvoiceLines } from "@/lib/ocr/invoice-line-item-alignment";
import {
  ocrTextUsesPosColumnTable,
  splitLineByPosColumn,
  stripPosColumnPrefix,
} from "@/lib/ocr/invoice-pos-column";
import {
  isHtmlDebrisLabel,
  normalizeOcrMarkdown,
  stripHtmlTags,
} from "./normalize-ocr-markdown";
import {
  isPercentRestatedAsAmount,
  type InvoiceLineItem,
} from "./text-parse-schema";
import { parseGermanMoneyAmount } from "./parse-german-money";
import {
  extractWorkshopSectionLineItems,
  isWorkshopSectionInvoiceText,
  reconcileWorkshopLineItemsWithOcrText,
} from "./invoice-workshop-sections";

const MAX_ITEMS = 60;
const MAX_LABEL = 160;

/** Skip totals / headers that are not sellable positions. */
const SKIP_LABEL =
  /^(?:summe|gesamt(?:betrag)?|nettosumme|netto\s*summe|zwischensumme|netto(?:betrag)?|brutto(?:betrag)?|rechnungsbetrag|zahlbetrag|zu\s*zahlen|betrag|position(?:en)?|bezeichnung|menge|einzelpreis|gesamtpreis|artikel|pos\.?|nr\.?|seite|page|tel|fax|iban|bic|ust[- ]?id|steuer[- ]?nr)\b/i;

const VAT_LABEL = /\b(?:mwst|m\.?\s*w\.?\s*st\.?|ust\.?|umsatzsteuer|vat|steuer)\b/i;

/**
 * Material / parts that must stay as their own line when OCR glues them together.
 */
const MATERIAL_MARKERS = [
  "reifen",
  "felgen",
  "rader",
  "räder",
  "sportfedern",
  "federn",
  "fahrwerk",
  "gewindefahrwerk",
  "auspuff",
  "abgasanlage",
  "downpipe",
  "katalysator",
  "bremsen",
  "bremsscheiben",
  "bremsbeläge",
  "bremsbelage",
  "kupplung",
  "getriebe",
  "motoröl",
  "motoroel",
  "ölfilter",
  "oelfilter",
  "luftfilter",
  "zündkerzen",
  "zuendkerzen",
  "batterie",
  "stoßdämpfer",
  "stossdaempfer",
  "querlenker",
  "koppelstange",
  "spurstange",
  "zahnriemen",
  "steuerkette",
  "turbo",
  "intercooler",
  "frontlippe",
  "spoiler",
  "diffuser",
  "scheibenwischer",
  "wischblatt",
  "kühlmittel",
  "kuehlmittel",
  "bremsflüssigkeit",
  "bremsfluessigkeit",
  "material",
  "ersatzteil",
  "teile",
];

const LABOR_MARKERS = [
  "arbeitslohn",
  "arbeitszeit",
  "montage",
  "demontage",
  "einbau",
  "ausbau",
  "diagnose",
  "prüfung",
  "pruefung",
  "achsvermessung",
  "wuchten",
  "auswuchten",
  "entsorgung",
  "entsorgungsgebühr",
  "entsorgungsgebuehr",
  "kleinmaterial",
  "dichtungen",
];

function cleanLabel(value: string): string {
  return stripHtmlTags(value)
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\d\s.\)\-•*]+/, "")
    .replace(/\s*(?:€|eur|euro)\s*$/i, "")
    .trim()
    .slice(0, MAX_LABEL);
}

const MONEY =
  /-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\d+,\d{2}/g;

const INLINE_FOOTER_MARKER =
  /\b(?:nettosumme|netto\s*summe|gesamtbetrag|mwst|m\.?\s*w\.?\s*st\.?|umsatzsteuer|vat)\b/i;

/** Split glued table rows and drop inline footer fragments from one OCR line. */
export function expandCompoundInvoiceTableLines(
  line: string,
  options: { usePosColumn?: boolean } = {},
): string[] {
  let trimmed = line.replace(/[^\S\n]+/g, " ").trim();
  if (trimmed.length < 4) return [];

  const footerIndex = trimmed.search(INLINE_FOOTER_MARKER);
  if (footerIndex > 0) {
    trimmed = trimmed.slice(0, footerIndex).trim();
  }
  if (!trimmed) return [];

  if (options.usePosColumn) {
    const posSegments = splitLineByPosColumn(trimmed);
    if (posSegments.length > 1) return posSegments;
  }

  const segments = trimmed.split(
    /\s(?=\d{1,2}\s+(?:\d{3,}\s+)?[A-Za-zÄÖÜäöüß§])/,
  );
  if (segments.length <= 1) return [trimmed];

  return segments.map((segment) => segment.trim()).filter((segment) => segment.length >= 4);
}

/** A single table row must not carry the invoice brutto total when several positions exist. */
export function isPlausiblePositionLineAmount(
  amount: number,
  options: {
    footerGross?: number | null;
    footerNet?: number | null;
    multiPosition?: boolean;
  } = {},
): boolean {
  const { footerGross = null, footerNet = null, multiPosition = false } = options;
  if (!Number.isFinite(amount) || amount <= 0) return false;

  if (
    multiPosition &&
    footerGross != null &&
    Math.abs(amount - footerGross) <= 0.05
  ) {
    return false;
  }

  if (
    footerNet != null &&
    footerGross != null &&
    Math.abs(amount - footerGross) <= 0.05 &&
    Math.abs(amount - footerNet) > 0.05
  ) {
    return false;
  }

  return true;
}

/** True when a matched number is a percentage rate, not a EUR amount. */
function isPercentToken(text: string, index: number, raw: string): boolean {
  const after = text.slice(index + raw.length);
  return /^\s*%/.test(after);
}

function parseGermanAmount(raw: string): number | null {
  return parseGermanMoneyAmount(raw);
}

function isPlausibleLabel(label: string): boolean {
  if (label.length < 2 || label.length > MAX_LABEL) return false;
  if (isHtmlDebrisLabel(label)) return false;
  if (SKIP_LABEL.test(label)) return false;
  if (isInvoiceFooterSummaryLabel(label)) return false;
  if (isJunkInvoiceLineLabel(label)) return false;
  if (VAT_LABEL.test(label)) return false;
  if (/^\d+([.,]\d+)?$/.test(label)) return false;
  // Require a real word — bare "td"/"th" from HTML tags must not pass.
  if (!/[a-zäöüß]{2,}/i.test(label)) return false;
  return true;
}

function pushItem(
  items: InvoiceLineItem[],
  seen: Set<string>,
  label: string,
  amount: number,
) {
  const cleaned = cleanLabel(label);
  if (!isPlausibleLabel(cleaned)) return;
  if (!Number.isFinite(amount)) return;
  // "Rabatt -15%" must not become a €15 / €-15 position.
  if (isPercentRestatedAsAmount(cleaned, amount)) return;

  const key = `${cleaned.toLowerCase()}|${amount}`;
  if (seen.has(key)) return;
  seen.add(key);
  items.push({ label: cleaned, amount });
}

/**
 * From a position line, take Gesamtpreis (rightmost money token), never Einzelpreis.
 * Typical: "4 Reifen … 120,00 480,00" → 480,00
 */
export function lineTotalFromInvoiceRow(
  line: string,
  options: { stripPosPrefix?: boolean } = {},
): {
  label: string;
  amount: number;
} | null {
  const normalized = line.replace(/[^\S\n]+/g, " ").trim();
  if (normalized.length < 4) return null;

  const moneyMatches = [...normalized.matchAll(new RegExp(MONEY.source, "g"))];
  if (moneyMatches.length === 0) return null;

  const amounts = moneyMatches
    .map((match) => ({
      raw: match[0],
      index: match.index ?? 0,
      value: parseGermanAmount(match[0]),
    }))
    .filter(
      (entry): entry is { raw: string; index: number; value: number } =>
        entry.value !== null &&
        !isPercentToken(normalized, entry.index, entry.raw),
    );

  if (amounts.length === 0) return null;

  // Prefer qty × unit ≈ total when three trailing numbers look like that.
  let total = amounts[amounts.length - 1]!;
  if (amounts.length >= 2) {
    const unit = amounts[amounts.length - 2]!;
    const beforeUnit = normalized.slice(0, unit.index);
    const qtyMatch = beforeUnit.match(/(\d+(?:[.,]\d+)?)\s*$/);
    const qty = qtyMatch ? Number.parseFloat(qtyMatch[1]!.replace(",", ".")) : NaN;
    if (
      Number.isFinite(qty) &&
      qty > 0 &&
      qty <= 100 &&
      Math.abs(qty * unit.value - total.value) <= 0.05
    ) {
      // confirmed: last amount is line total
    } else if (amounts.length >= 2) {
      // Still prefer rightmost money column (Gesamt) over earlier Einzelpreis.
      total = amounts[amounts.length - 1]!;
    }
  }

  let label = normalized.slice(0, total.index).trim();
  // Drop leftover unit-price / qty columns from the label.
  label = label
    .replace(new RegExp(`(?:${MONEY.source})\\s*$`, "g"), "")
    .replace(/\s+\d+(?:[.,]\d+)?\s*(?:x|×|stk|stück|st\.?|stk\.?)?\s*$/i, "")
    .replace(/\s+[A-Z0-9]{1,2}\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (options.stripPosPrefix) {
    label = stripPosColumnPrefix(label);
  }

  if (!label || !isPlausibleLabel(cleanLabel(label))) return null;
  return { label, amount: total.value };
}

/**
 * Pull invoice positions from OCR lines.
 * Always stores Gesamtpreis / Zeilensumme — never Einzelpreis.
 */
export function extractInvoiceLineItemsFromText(
  rawText: string,
): InvoiceLineItem[] | null {
  const normalized = normalizeOcrMarkdown(rawText);

  if (isWorkshopSectionInvoiceText(normalized)) {
    const sectionItems = extractWorkshopSectionLineItems(normalized);
    if (sectionItems?.length) return sectionItems;
  }

  const text = prejoinWrappedInvoiceLines(normalized);
  const usePosColumn = ocrTextUsesPosColumnTable(normalized);
  const items: InvoiceLineItem[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split("\n")) {
    for (const segment of expandCompoundInvoiceTableLines(rawLine, {
      usePosColumn,
    })) {
      const parsed = lineTotalFromInvoiceRow(segment, {
        stripPosPrefix: usePosColumn,
      });
      if (!parsed) continue;

      // Ignore pure quantity × unit rows without a name.
      if (
        /^\d+\s*[x×]\s*\d/i.test(parsed.label) &&
        !/[a-zäöüß]{3,}/i.test(parsed.label)
      ) {
        continue;
      }

      pushItem(items, seen, parsed.label, parsed.amount);
      if (items.length >= MAX_ITEMS) break;
    }
    if (items.length >= MAX_ITEMS) break;
  }

  return items.length > 0 ? items : null;
}

function materialHits(label: string): string[] {
  const lower = label.toLowerCase();
  return MATERIAL_MARKERS.filter((marker) => lower.includes(marker));
}

function laborHits(label: string): string[] {
  const lower = label.toLowerCase();
  return LABOR_MARKERS.filter((marker) => lower.includes(marker));
}

/**
 * True when a single LLM label clearly glues several parts/labor together.
 */
export function looksMergedLineItem(label: string): boolean {
  const materials = materialHits(label);
  const labor = laborHits(label);
  if (materials.length >= 2) return true;
  if (materials.length >= 1 && labor.length >= 1) return true;
  if (/\s+(?:und|&|\+|\/)\s+/i.test(label) && materials.length + labor.length >= 2) {
    return true;
  }
  // Long glued labels with multiple commas often hide separate positions.
  if ((label.match(/,/g) ?? []).length >= 2 && label.length > 48) return true;
  return false;
}

/**
 * Prefer the more granular line-item set (heuristic vs LLM).
 * Heuristic wins when it has clearly more positions or LLM glued materials.
 */
export function preferInvoiceLineItems(
  primary: InvoiceLineItem[] | null | undefined,
  fallback: InvoiceLineItem[] | null | undefined,
): InvoiceLineItem[] | null {
  const a = primary ?? [];
  const b = fallback ?? [];
  if (a.length === 0 && b.length === 0) return null;
  if (a.length === 0) return b.slice(0, MAX_ITEMS);
  if (b.length === 0) return a.slice(0, MAX_ITEMS);

  const aClean = stripNonPositionInvoiceRows(a) ?? [];
  const bClean = stripNonPositionInvoiceRows(b) ?? [];
  const aHasFooterJunk = a.some((item) => isInvoiceFooterSummaryLabel(item.label));
  const aSum = aClean.reduce((sum, item) => sum + item.amount, 0);
  const bSum = bClean.reduce((sum, item) => sum + item.amount, 0);

  const aMerged = a.some((item) => looksMergedLineItem(item.label));
  const bHasMaterials = b.some((item) => materialHits(item.label).length > 0);
  const aHasVat = a.some((item) => VAT_LABEL.test(item.label));
  const bHasVat = b.some((item) => VAT_LABEL.test(item.label));

  if (aHasFooterJunk && bClean.length >= 2 && bClean.length >= aClean.length) {
    const plausibleVat = a.filter(
      (item) =>
        VAT_LABEL.test(item.label) &&
        isPlausibleInvoiceVatAmount(item.amount, bSum),
    );
    return mergeUnique(
      bClean,
      aHasVat && !bHasVat ? plausibleVat : [],
    );
  }

  if (aMerged && b.length >= a.length) {
    return mergeUnique(b, aHasVat && !bHasVat ? a.filter((i) => VAT_LABEL.test(i.label)) : []);
  }

  if (b.length >= a.length + 1 && bHasMaterials) {
    return mergeUnique(b, aHasVat && !bHasVat ? a.filter((i) => VAT_LABEL.test(i.label)) : []);
  }

  // Keep LLM order, but append heuristic material rows that LLM missed.
  const missingMaterials = b.filter((item) => {
    const hits = materialHits(item.label);
    if (hits.length === 0) return false;
    return !a.some(
      (existing) =>
        materialHits(existing.label).some((hit) => hits.includes(hit)) ||
        existing.label.toLowerCase().includes(item.label.toLowerCase().slice(0, 12)),
    );
  });

  if (missingMaterials.length > 0) {
    return mergeUnique(aClean.length > 0 ? aClean : a, missingMaterials);
  }

  return (aClean.length > 0 ? aClean : a).slice(0, MAX_ITEMS);
}

function mergeUnique(
  primary: InvoiceLineItem[],
  extra: InvoiceLineItem[],
): InvoiceLineItem[] {
  const out: InvoiceLineItem[] = [];
  const seen = new Set<string>();
  for (const item of [...primary, ...extra]) {
    const key = `${item.label.toLowerCase()}|${item.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: item.label.trim().slice(0, MAX_LABEL),
      amount: Math.round(item.amount * 100) / 100,
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function labelMatchScoreForReconcile(a: string, b: string): number {
  const keyA = normalizedInvoiceLineLabelKey(a);
  const keyB = normalizedInvoiceLineLabelKey(b);
  if (!keyA || !keyB) return 0;
  if (keyA === keyB) return 100;
  if (keyA.includes(keyB) || keyB.includes(keyA)) return 80;

  const wordsA = new Set(keyA.split(" ").filter((word) => word.length >= 3));
  const wordsB = keyB.split(" ").filter((word) => word.length >= 3);
  const overlap = wordsB.filter((word) => wordsA.has(word)).length;
  if (overlap >= 2) return 60;
  if (overlap === 1) return 35;
  return 0;
}

/** Pos → line item from OCR text (stable row anchors for column reconcile). */
function buildPosKeyedOcrLineItems(rawText: string): Map<number, InvoiceLineItem> {
  const normalized = normalizeOcrMarkdown(rawText);
  if (!ocrTextUsesPosColumnTable(normalized)) return new Map();

  const text = prejoinWrappedInvoiceLines(normalized);
  const posMap = new Map<number, InvoiceLineItem>();

  for (const rawLine of text.split("\n")) {
    for (const segment of expandCompoundInvoiceTableLines(rawLine, {
      usePosColumn: true,
    })) {
      const posMatch = segment.trim().match(/^(\d{1,2})\s+/);
      if (!posMatch) continue;

      const pos = Number.parseInt(posMatch[1] ?? "", 10);
      if (!Number.isFinite(pos) || pos < 1 || pos > 60) continue;

      const parsed = lineTotalFromInvoiceRow(segment, { stripPosPrefix: true });
      if (!parsed) continue;

      posMap.set(pos, {
        label: parsed.label,
        amount: Math.round(parsed.amount * 100) / 100,
      });
    }
  }

  return posMap;
}

function shouldUpgradeAmountFromOcrMatch(options: {
  itemAmount: number;
  textAmount: number;
  labelScore: number;
}): boolean {
  if (Math.abs(options.textAmount - options.itemAmount) < 0.011) return false;
  if (options.labelScore >= 75) return true;
  if (isUnitPriceAmountOfTotal(options.itemAmount, options.textAmount)) return true;
  if (
    options.textAmount > options.itemAmount + 0.01 &&
    isUnitPriceAmountOfTotal(options.itemAmount, options.textAmount)
  ) {
    return true;
  }
  return false;
}

/** Pos tables: label match with Pos-keyed OCR rows; index only as tie-breaker. */
function reconcileColumnTableLineItemsWithOcrText(
  items: InvoiceLineItem[],
  rawText: string,
): InvoiceLineItem[] {
  const textItems = extractInvoiceLineItemsFromText(rawText);
  const posKeyed = buildPosKeyedOcrLineItems(rawText);
  if (!textItems?.length && posKeyed.size === 0) return items;

  const footerGross = extractGrossTotalFromText(rawText);
  const footerNet = extractNetSumFromText(rawText);
  const multiPosition = items.length > 1;
  const usedTextIndexes = new Set<number>();
  const usedPosNumbers = new Set<number>();

  return items.map((item, itemIndex) => {
    let bestMatch: InvoiceLineItem | null = null;
    let bestScore = 0;
    let bestIndex = -1;
    let bestPos = -1;

    const expectedPos = itemIndex + 1;
    if (posKeyed.has(expectedPos)) {
      const posItem = posKeyed.get(expectedPos)!;
      const score = labelMatchScoreForReconcile(item.label, posItem.label);
      if (score >= 25) {
        bestMatch = posItem;
        bestScore = Math.max(score, 55);
        bestPos = expectedPos;
      }
    }

    if (posKeyed.size > 0) {
      for (const [pos, textItem] of posKeyed) {
        if (usedPosNumbers.has(pos)) continue;
        if (pos === bestPos) continue;
        const score = labelMatchScoreForReconcile(item.label, textItem.label);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = textItem;
          bestPos = pos;
        }
      }
    }

    if (!bestMatch || bestScore < 35) {
      for (const [index, textItem] of (textItems ?? []).entries()) {
        if (usedTextIndexes.has(index)) continue;
        let score = labelMatchScoreForReconcile(item.label, textItem.label);
        if (index === itemIndex) score += 12;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = textItem;
          bestIndex = index;
          bestPos = -1;
        }
      }
    }

    if (!bestMatch || bestScore < 35) return item;

    const textAmount = bestMatch.amount;
    if (Math.abs(textAmount - item.amount) < 0.011) {
      if (bestPos > 0) usedPosNumbers.add(bestPos);
      else if (bestIndex >= 0) usedTextIndexes.add(bestIndex);
      return item;
    }

    if (
      !isPlausiblePositionLineAmount(textAmount, {
        footerGross,
        footerNet,
        multiPosition,
      })
    ) {
      return item;
    }

    if (
      !shouldUpgradeAmountFromOcrMatch({
        itemAmount: item.amount,
        textAmount,
        labelScore: bestScore,
      })
    ) {
      return item;
    }

    if (bestPos > 0) usedPosNumbers.add(bestPos);
    else if (bestIndex >= 0) usedTextIndexes.add(bestIndex);
    return { ...item, amount: textAmount };
  });
}

/**
 * Replace LLM Einzelpreis with Ges. Preis from OCR text when the row has both values.
 */
export function reconcileLineItemAmountsWithOcrText(
  items: InvoiceLineItem[] | null | undefined,
  rawText: string,
): InvoiceLineItem[] | null {
  if (!items?.length || !rawText.trim()) return items ?? null;

  if (isWorkshopSectionInvoiceText(rawText)) {
    return reconcileWorkshopLineItemsWithOcrText(items, rawText);
  }

  if (ocrTextUsesPosColumnTable(rawText)) {
    return reconcileColumnTableLineItemsWithOcrText(items, rawText);
  }

  const textItems = extractInvoiceLineItemsFromText(rawText);
  if (!textItems?.length) return items;

  const footerGross = extractGrossTotalFromText(rawText);
  const footerNet = extractNetSumFromText(rawText);
  const multiPosition = items.length > 1;
  const usedTextIndexes = new Set<number>();

  const corrected = items.map((item) => {
    let bestMatch: InvoiceLineItem | null = null;
    let bestScore = 0;
    let bestIndex = -1;

    for (const [index, textItem] of textItems.entries()) {
      if (usedTextIndexes.has(index)) continue;
      const score = labelMatchScoreForReconcile(item.label, textItem.label);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = textItem;
        bestIndex = index;
      }
    }

    if (!bestMatch || bestScore < 35 || bestIndex < 0) return item;

    const textAmount = bestMatch.amount;
    if (Math.abs(textAmount - item.amount) < 0.011) return item;

    if (
      !isPlausiblePositionLineAmount(textAmount, {
        footerGross,
        footerNet,
        multiPosition,
      })
    ) {
      return item;
    }

    if (bestScore >= 60) {
      usedTextIndexes.add(bestIndex);
      return { ...item, amount: textAmount };
    }

    if (textAmount > item.amount + 0.01) {
      if (isUnitPriceAmountOfTotal(item.amount, textAmount)) {
        usedTextIndexes.add(bestIndex);
        return { ...item, amount: textAmount };
      }
    }

    if (isUnitPriceAmountOfTotal(item.amount, textAmount)) {
      usedTextIndexes.add(bestIndex);
      return { ...item, amount: textAmount };
    }

    return item;
  });

  return corrected;
}
