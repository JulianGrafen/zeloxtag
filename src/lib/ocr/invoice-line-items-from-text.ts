/**
 * Heuristic invoice line-item extraction from OCR text.
 * Splits material / labor / VAT into separate positions when the LLM merges them.
 */

import type { InvoiceLineItem } from "./text-parse-schema";

const MAX_ITEMS = 40;
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
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\d\s.\)\-•*]+/, "")
    .replace(/\s*(?:€|eur|euro)\s*$/i, "")
    .trim()
    .slice(0, MAX_LABEL);
}

const MONEY =
  /-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\d+,\d{2}/g;

function parseGermanAmount(raw: string): number | null {
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:[.,]|$))/g, "")
    .replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function isPlausibleLabel(label: string): boolean {
  if (label.length < 2 || label.length > MAX_LABEL) return false;
  if (SKIP_LABEL.test(label)) return false;
  if (/^\d+([.,]\d+)?$/.test(label)) return false;
  return /[a-zäöüß]/i.test(label);
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

  const key = `${cleaned.toLowerCase()}|${amount}`;
  if (seen.has(key)) return;
  seen.add(key);
  items.push({ label: cleaned, amount });
}

/**
 * From a position line, take Gesamtpreis (rightmost money token), never Einzelpreis.
 * Typical: "4 Reifen … 120,00 480,00" → 480,00
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
        entry.value !== null,
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
    .replace(/\s+/g, " ")
    .trim();

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
  const text = rawText.replace(/\r\n/g, "\n");
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
