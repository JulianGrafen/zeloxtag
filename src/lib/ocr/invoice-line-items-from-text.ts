/**
 * Heuristic invoice line-item extraction from OCR text.
 * Splits material / labor / VAT into separate positions when the LLM merges them.
 */

import {
  isUnitPriceAmountOfTotal,
  normalizedInvoiceLineLabelKey,
} from "@/lib/ocr/invoice-line-item-dedupe";
import { prejoinWrappedInvoiceLines } from "@/lib/ocr/invoice-line-item-alignment";
import {
  parseInvoiceQuantityCell,
  resolveInvoiceLineTotalAmount,
} from "@/lib/ocr/invoice-line-total";
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

const MAX_ITEMS = 60;
const MAX_LABEL = 160;

/** Skip totals / headers that are not sellable positions. */
const SKIP_LABEL =
  /^(?:summe|gesamt(?:betrag)?|zwischensumme|netto(?:betrag)?|brutto(?:betrag)?|rechnungsbetrag|zahlbetrag|zu\s*zahlen|betrag|position(?:en)?|bezeichnung|menge|einzelpreis|gesamtpreis|artikel|pos\.?|nr\.?|seite|page|tel|fax|iban|bic|ust[- ]?id|steuer[- ]?nr)\b/i;

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

function readQuantityBeforeIndex(text: string, endIndex: number): number | null {
  const prefix = text.slice(0, endIndex).trim();
  const qtyMatch = prefix.match(/(\d+(?:[.,]\d+)?)\s*$/);
  if (!qtyMatch?.[1]) return null;
  return parseInvoiceQuantityCell(qtyMatch[1].replace(",", "."));
}

/**
 * From a position line, resolve Gesamtpreis via Menge × E-Preis (Prüfsumme Ges.-Spalte).
 */
export function lineTotalFromInvoiceRow(line: string): {
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

  const unitEntry =
    amounts.length >= 2 ? amounts[amounts.length - 2]! : amounts[0]!;
  const totalEntry = amounts[amounts.length - 1]!;
  const quantity = readQuantityBeforeIndex(normalized, unitEntry.index);

  const amount = resolveInvoiceLineTotalAmount({
    quantity,
    unitPrice: unitEntry.value,
    statedTotal: totalEntry.value,
  });

  if (amount == null) return null;

  let label = normalized.slice(0, unitEntry.index).trim();
  label = label
    .replace(new RegExp(`(?:${MONEY.source})\\s*$`, "g"), "")
    .replace(/\s+\d+(?:[.,]\d+)?\s*(?:x|×|stk|stück|st\.?|stk\.?)?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!label || !isPlausibleLabel(cleanLabel(label))) return null;
  return { label, amount };
}

/**
 * Pull invoice positions from OCR lines.
 * Always stores Gesamtpreis / Zeilensumme — never Einzelpreis.
 */
export function extractInvoiceLineItemsFromText(
  rawText: string,
): InvoiceLineItem[] | null {
  // Azure Markdown often ships HTML <table>/<td> — convert before row parse.
  const normalized = normalizeOcrMarkdown(rawText);
  const text = prejoinWrappedInvoiceLines(normalized);
  const items: InvoiceLineItem[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split("\n")) {
    const parsed = lineTotalFromInvoiceRow(rawLine);
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

  const aMerged = a.some((item) => looksMergedLineItem(item.label));
  const bHasMaterials = b.some((item) => materialHits(item.label).length > 0);
  const aHasVat = a.some((item) => VAT_LABEL.test(item.label));
  const bHasVat = b.some((item) => VAT_LABEL.test(item.label));

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
    return mergeUnique(a, missingMaterials);
  }

  return a.slice(0, MAX_ITEMS);
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

/**
 * Replace LLM Einzelpreis with Ges. Preis from OCR text when the row has both values.
 */
export function reconcileLineItemAmountsWithOcrText(
  items: InvoiceLineItem[] | null | undefined,
  rawText: string,
): InvoiceLineItem[] | null {
  if (!items?.length || !rawText.trim()) return items ?? null;

  const textItems = extractInvoiceLineItemsFromText(rawText);
  if (!textItems?.length) return items;

  const corrected = items.map((item) => {
    let bestMatch: InvoiceLineItem | null = null;
    let bestScore = 0;

    for (const textItem of textItems) {
      const score = labelMatchScoreForReconcile(item.label, textItem.label);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = textItem;
      }
    }

    if (!bestMatch || bestScore < 35) return item;

    const textAmount = bestMatch.amount;
    if (Math.abs(textAmount - item.amount) < 0.011) return item;

    if (textAmount > item.amount + 0.01) {
      if (isUnitPriceAmountOfTotal(item.amount, textAmount)) {
        return { ...item, amount: textAmount };
      }
    }

    if (isUnitPriceAmountOfTotal(item.amount, textAmount)) {
      return { ...item, amount: textAmount };
    }

    if (item.amount + 0.01 < textAmount) {
      return { ...item, amount: textAmount };
    }

    return item;
  });

  return corrected;
}
