/**
 * DMS / Werkstatt-Rechnungen mit Abschnitten:
 * Arbeitswerte | Ersatzteile | Sonstige Kosten (z. B. SPEEDWORKZ, KSR, Autosoft).
 */

import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";

const MAX_ITEMS = 60;
const MAX_LABEL = 160;

const MONEY = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/;

type WorkshopSection = "labor" | "parts" | "other" | "none";

const SECTION_LABOR = /^arbeitswerte\b/i;
const SECTION_PARTS = /^ersatzteile\b/i;
const SECTION_OTHER = /^sonstige\s+kosten\b/i;
const SECTION_STOP =
  /^(?:zwischensummen|endsummen|netto\s+summe|positionssumme|zahlbar|endsumme)\b/i;

const SKIP_LINE =
  /^(?:beschreibung|rab\.?\s*%|art\.?|pg\.?|std\.?|preis|einzelpreis|mechanik|ersatzteile|sonstige\s+kosten|positionssumme|netto|mwst|endpreis|endsummen|zahlbar)\b/i;

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
  return hasLabor && (hasParts || hasOther);
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

/** "1 Stück Wasserschlauch … 65,12 65,12" or discounted "… 41,04 28,73". */
function parsePartsLine(line: string): { label: string; amount: number } | null {
  const qtyMatch = line.match(/^(\d+)\s*(?:Stück|Stk\.?)\s+/i);
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
  if (SECTION_LABOR.test(line)) return "labor";
  if (SECTION_PARTS.test(line)) return "parts";
  if (SECTION_OTHER.test(line)) return "other";
  if (SECTION_STOP.test(line)) return "none";
  return current;
}

/**
 * Parse section-based workshop invoices from OCR plain text.
 */
export function extractWorkshopSectionLineItems(
  rawText: string,
): InvoiceLineItem[] | null {
  const normalized = rawText.replace(/\r\n/g, "\n");
  if (!hasSectionHeaders(normalized)) return null;

  const items: InvoiceLineItem[] = [];
  const seen = new Set<string>();
  let section: WorkshopSection = "none";

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;

    section = detectSection(line, section);
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

    if (!parsed) continue;

    const key = `${parsed.label.toLowerCase()}|${parsed.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(parsed);

    if (items.length >= MAX_ITEMS) break;
  }

  return items.length >= 3 ? items : null;
}

/** Prefer Endpreis (brutto), then Netto Summe from Endsummen block. */
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

  const netto = [
    ...text.matchAll(
      /netto\s+summe\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*(?:€|eur)?/gi,
    ),
  ]
    .map((match) => parseMoney(match[1] ?? ""))
    .filter((value): value is number => value != null);

  if (netto.length > 0) {
    return Math.max(...netto);
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
  return hasSectionHeaders(rawText.replace(/\r\n/g, "\n"));
}
