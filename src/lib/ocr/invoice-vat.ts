import { sumLineItems } from "@/lib/documents/line-items";
import {
  extractGrossTotalFromText,
  extractNetSumFromText,
  stripInvoiceFooterSummaryRows,
} from "@/lib/ocr/invoice-footer-totals";
import { ocrTextUsesPosColumnTable } from "@/lib/ocr/invoice-pos-column";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import {
  extractWorkshopInvoiceVatAmount,
  isWorkshopSectionInvoiceText,
} from "@/lib/ocr/invoice-workshop-sections";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

const DEFAULT_VAT_RATE = 0.19;

export const VAT_LABEL =
  /\b(?:mwst|m\.?\s*w\.?\s*st\.?|ust\.?|umsatzsteuer|vat)\b/i;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isVatLineItem(item: InvoiceLineItem): boolean {
  return VAT_LABEL.test(item.label);
}

function splitVatLineItems(items: InvoiceLineItem[]): {
  positions: InvoiceLineItem[];
  vatItems: InvoiceLineItem[];
} {
  const positions: InvoiceLineItem[] = [];
  const vatItems: InvoiceLineItem[] = [];
  for (const item of items) {
    if (isVatLineItem(item)) vatItems.push(item);
    else positions.push(item);
  }
  return { positions, vatItems };
}

function looksLikeVatAmount(vat: number, net: number): boolean {
  if (vat <= 0 || net <= 0) return false;
  const expected = roundMoney(net * DEFAULT_VAT_RATE);
  return Math.abs(vat - expected) <= Math.max(0.05, net * 0.02);
}

/** True when gross − net matches a plausible MwSt gap (incl. mixed-rate invoices). */
export function grossAmountLooksPlausible(netSum: number, gross: number): boolean {
  if (gross <= netSum + 0.05) return false;
  return isPlausibleInvoiceVatAmount(roundMoney(gross - netSum), netSum);
}

/** MwSt must be positive and cannot exceed 19% of the net position sum (mixed-rate invoices allowed). */
export function isPlausibleInvoiceVatAmount(vat: number, netSum: number): boolean {
  if (vat <= 0 || vat >= netSum) return false;
  return vat <= roundMoney(netSum * DEFAULT_VAT_RATE) + 0.05;
}

function resolveInvoiceVatAmount(options: {
  vatItems: InvoiceLineItem[];
  netSum: number;
  ocrText: string;
  grossAmount: number | null;
}): number {
  const { vatItems, netSum, ocrText, grossAmount } = options;

  const fromOcr = ocrText ? extractVatAmountFromText(ocrText) : null;
  const fromWorkshop =
    ocrText && isWorkshopSectionInvoiceText(ocrText)
      ? extractWorkshopInvoiceVatAmount(ocrText)
      : null;

  if (fromWorkshop != null && isPlausibleInvoiceVatAmount(fromWorkshop, netSum)) {
    return fromWorkshop;
  }
  if (fromOcr != null && isPlausibleInvoiceVatAmount(fromOcr, netSum)) {
    return fromOcr;
  }

  const fromItems = vatItems
    .map((item) => item.amount)
    .filter((amount) => isPlausibleInvoiceVatAmount(amount, netSum));
  if (fromItems.length === 1) return fromItems[0]!;
  if (fromItems.length > 1) return Math.min(...fromItems);

  if (grossAmount != null && grossAmount > netSum + 0.05) {
    const diff = roundMoney(grossAmount - netSum);
    if (isPlausibleInvoiceVatAmount(diff, netSum)) return diff;
  }

  if (fromOcr != null && fromOcr > 0) return fromOcr;

  return roundMoney(netSum * DEFAULT_VAT_RATE);
}

/** Parse € amount from a footer line like "MwSt 19% 114,00 €". */
export function extractVatAmountFromText(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");
  for (const line of text.split("\n")) {
    if (!VAT_LABEL.test(line)) continue;
    if (/%/.test(line) && !/\d[.,]\d{2}/.test(line)) continue;

    const amounts = [
      ...line.matchAll(
        /([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+,\d{2}|[0-9]+\.\d{2})/g,
      ),
    ]
      .map((match) => parseGermanMoneyAmount(match[1] ?? ""))
      .filter((value): value is number => value != null);

    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }
  return null;
}

function extractVatLineFromText(rawText: string): InvoiceLineItem | null {
  const text = rawText.replace(/\r\n/g, "\n");
  for (const line of text.split("\n")) {
    if (!VAT_LABEL.test(line)) continue;
    const amount = extractVatAmountFromText(line);
    if (amount == null) continue;

    const label = line
      .replace(/[0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+,\d{2}|[0-9]+\.\d{2}/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

    return {
      label: label.length >= 3 ? label : "MwSt 19%",
      amount,
    };
  }
  return null;
}

function resolveGrossAmount(
  amount: number | null,
  grossFromItems: number,
): number {
  if (amount != null && amount + 0.05 >= grossFromItems) {
    return roundMoney(amount);
  }
  return grossFromItems;
}

/**
 * Ensure invoice positions include MwSt and document amount reflects brutto total.
 * Positions table values are net; footer MwSt is appended when missing.
 */
export function ensureInvoiceVatAndGrossTotal(options: {
  lineItems: InvoiceLineItem[] | null;
  amount: number | null;
  ocrText?: string;
}): { lineItems: InvoiceLineItem[] | null; amount: number | null } {
  const { lineItems, amount, ocrText = "" } = options;
  if (!lineItems?.length) return { lineItems, amount };

  const positionsOnly = stripInvoiceFooterSummaryRows(lineItems) ?? lineItems;
  const { positions, vatItems } = splitVatLineItems(positionsOnly);
  let netSum = sumLineItems(positions);
  if (netSum == null || netSum <= 0) return { lineItems, amount };

  const footerNet = ocrText ? extractNetSumFromText(ocrText) : null;
  const footerGross = ocrText ? extractGrossTotalFromText(ocrText) : null;
  const resolvedGross = amount ?? footerGross;

  if (
    resolvedGross != null &&
    netSum > resolvedGross + 0.05 &&
    footerNet != null &&
    ocrTextUsesPosColumnTable(ocrText)
  ) {
    netSum = footerNet;
  } else if (resolvedGross != null && netSum > resolvedGross + 0.05 && positions.length > 1) {
    return { lineItems: positionsOnly, amount: roundMoney(resolvedGross) };
  }

  if (
    resolvedGross != null &&
    footerNet != null &&
    Math.abs(netSum - footerNet) <= 1.5 &&
    grossAmountLooksPlausible(footerNet, resolvedGross)
  ) {
    // Positions reconcile with footer net — proceed with VAT enrichment.
  } else if (
    resolvedGross != null &&
    Math.abs(resolvedGross - netSum) <= 0.05 &&
    !footerGross
  ) {
    return { lineItems: positionsOnly, amount: roundMoney(resolvedGross) };
  }

  if (resolvedGross != null && Math.abs(resolvedGross - netSum) <= 0.05 && !vatItems.length) {
    return { lineItems: positionsOnly, amount: roundMoney(resolvedGross) };
  }

  const vatAmount = resolveInvoiceVatAmount({
    vatItems,
    netSum,
    ocrText,
    grossAmount: resolvedGross,
  });

  const fromText = ocrText ? extractVatLineFromText(ocrText) : null;
  const vatLabel =
    fromText?.label ??
    vatItems.find((item) => item.label.trim().length >= 3)?.label ??
    "MwSt 19%";

  const items = [...positions, { label: vatLabel, amount: vatAmount }];
  const grossFromItems = roundMoney(netSum + vatAmount);

  return {
    lineItems: items,
    amount: resolveGrossAmount(resolvedGross ?? footerGross, grossFromItems),
  };
}
