import { sumLineItems } from "@/lib/documents/line-items";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import {
  extractGrossTotalFromText,
  extractNetSumFromText,
} from "@/lib/ocr/invoice-footer-totals";
import { ensureInvoiceVatAndGrossTotal } from "@/lib/ocr/invoice-vat";
import {
  extractWorkshopInvoiceAmount,
  isWorkshopSectionInvoiceText,
} from "@/lib/ocr/invoice-workshop-sections";
import { isMonetaryDiscountLabel } from "@/lib/ocr/text-parse-schema";
import type { DocumentLineItem } from "@/types/database";

/**
 * Heuristic gross-total extraction from German workshop invoice OCR.
 */

const MAX_AMOUNT = 250_000;
const MIN_AMOUNT = 1;

function parseEurAmount(raw: string): number | null {
  return parseGermanMoneyAmount(raw);
}

/** Skip captures that are percentage rates ("15%", "- 15 %"). */
function isFollowedByPercent(text: string, match: RegExpMatchArray): boolean {
  const end = (match.index ?? 0) + match[0].length;
  return /^\s*%/.test(text.slice(end));
}

/**
 * Extract invoice gross total (EUR) from OCR text.
 */
export function extractAmountFromText(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");

  const labeledPatterns = [
    /endpreis\s*[:.]?\s*(-?\s*[0-9][0-9.\s,]{0,14})\s*(?:€|eur)?/gi,
    /(?:rechnungsbetrag|zahlbetrag|gesamtbetrag|bruttobetrag|endbetrag|zu\s*zahlen|summe|gesamt|total|(?<![a-zäöüß])betrag)\s*[:.]?\s*(-?\s*[0-9][0-9.\s,]{0,14})\s*(?:€|eur)?/gi,
    /(?:€|eur)\s*(-?\s*[0-9][0-9.\s,]{0,14})\s*(?:gesamt|brutto|total)?/gi,
  ];

  const candidates: number[] = [];
  for (const pattern of labeledPatterns) {
    for (const match of text.matchAll(pattern)) {
      // "Skonto 15%" / "Betrag -15%" must never become the invoice total.
      if (/%/.test(match[0]) || isFollowedByPercent(text, match)) continue;
      const value = parseEurAmount(match[1] ?? "");
      if (value !== null) candidates.push(value);
    }
  }

  if (candidates.length > 0) {
    return Math.max(...candidates);
  }

  if (isWorkshopSectionInvoiceText(text)) {
    const workshopAmount = extractWorkshopInvoiceAmount(text);
    if (workshopAmount != null) return workshopAmount;
  }

  // Fallback: rightmost plausible € amounts on "Summe/Gesamt" lines.
  for (const line of text.split("\n")) {
    if (!/(?:summe|gesamt|brutto|zahlbetrag|rechnungsbetrag|total)/i.test(line)) {
      continue;
    }
    const amounts = [
      ...line.matchAll(
        /([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+,\d{2}|[0-9]+\.\d{2})/g,
      ),
    ]
      .filter((match) => !isFollowedByPercent(line, match))
      .map((match) => parseEurAmount(match[1] ?? ""))
      .filter((value): value is number => value !== null);
    if (amounts.length > 0) {
      candidates.push(Math.max(...amounts));
    }
  }

  return candidates.length > 0 ? Math.max(...candidates) : null;
}

/**
 * True when `amount` only appears in OCR as a percentage rate (e.g. "- 15%"),
 * not as a € total — guards LLM numeric hallucinations.
 */
export function amountAppearsOnlyAsPercent(
  amount: number,
  rawText: string,
): boolean {
  if (!Number.isFinite(amount)) return false;
  const abs = Math.abs(amount);
  const variants = new Set<string>();
  if (Number.isInteger(abs)) variants.add(String(abs));
  variants.add(abs.toFixed(2));
  variants.add(abs.toFixed(2).replace(".", ","));
  if (Number.isInteger(abs)) {
    variants.add(`${abs},00`);
    variants.add(`${abs}.00`);
  }

  let seenAsPercent = false;
  let seenAsEuro = false;
  for (const variant of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`-?\\s*${escaped}\\s*%`).test(rawText)) {
      seenAsPercent = true;
    }
    if (
      new RegExp(
        `(?:€|eur)\\s*-?\\s*${escaped}|-?\\s*${escaped}\\s*(?:€|eur)\\b`,
        "i",
      ).test(rawText)
    ) {
      seenAsEuro = true;
    }
  }
  return seenAsPercent && !seenAsEuro;
}

const GROSS_FROM_LINES_TOLERANCE_EUR = 0.05;

function lineItemsIncludeSignedDiscount(
  lineItems: DocumentLineItem[] | null | undefined,
): boolean {
  if (!lineItems?.length) return false;
  return lineItems.some(
    (item) =>
      item.amount < 0 ||
      (item.amount > 0 && isMonetaryDiscountLabel(item.label)),
  );
}

function grossFromLineItems(
  structured: number | null | undefined,
  rawText: string,
  lineItems: DocumentLineItem[] | null | undefined,
): number | null {
  if (!lineItems?.length) return null;
  return ensureInvoiceVatAndGrossTotal({
    lineItems,
    amount: structured ?? null,
    ocrText: rawText,
  }).amount;
}

/** Prefer structured LLM amount; fall back to OCR heuristic / line-item sum. */
export function preferAmount(
  structured: number | null | undefined,
  rawText: string,
  lineItems?: DocumentLineItem[] | null,
): number | null {
  const structuredValid =
    typeof structured === "number" &&
    Number.isFinite(structured) &&
    structured >= MIN_AMOUNT &&
    structured <= MAX_AMOUNT &&
    !amountAppearsOnlyAsPercent(structured, rawText)
      ? Math.round(structured * 100) / 100
      : null;

  const fromLines = grossFromLineItems(structuredValid, rawText, lineItems);
  const footerGross = rawText ? extractGrossTotalFromText(rawText) : null;
  const footerNet = rawText ? extractNetSumFromText(rawText) : null;

  if (
    structuredValid != null &&
    fromLines != null &&
    Math.abs(structuredValid - fromLines) > GROSS_FROM_LINES_TOLERANCE_EUR
  ) {
    if (
      footerGross != null &&
      Math.abs(fromLines - footerGross) <= GROSS_FROM_LINES_TOLERANCE_EUR
    ) {
      return fromLines;
    }
    if (lineItemsIncludeSignedDiscount(lineItems)) {
      if (
        footerNet == null ||
        footerGross == null ||
        Math.abs(fromLines - footerGross) <= 1.5
      ) {
        return fromLines;
      }
    }
  }

  if (structuredValid != null) return structuredValid;

  const fromText = extractAmountFromText(rawText);
  if (fromText !== null) return fromText;

  if (fromLines != null) return fromLines;

  return sumLineItems(lineItems ?? null);
}
