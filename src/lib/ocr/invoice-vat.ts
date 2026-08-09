import { sumLineItems } from "@/lib/documents/line-items";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
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

  const { positions, vatItems } = splitVatLineItems(lineItems);
  const netSum = sumLineItems(positions);
  if (netSum == null || netSum <= 0) return { lineItems, amount };

  if (amount != null && Math.abs(amount - netSum) <= 0.05) {
    return { lineItems, amount: roundMoney(amount) };
  }

  if (vatItems.length > 0) {
    const grossFromItems = roundMoney(
      netSum + vatItems.reduce((sum, item) => sum + item.amount, 0),
    );
    return {
      lineItems,
      amount: resolveGrossAmount(amount, grossFromItems),
    };
  }

  const fromText = ocrText ? extractVatLineFromText(ocrText) : null;
  let vatAmount = fromText?.amount ?? null;

  if (vatAmount == null && amount != null && amount > netSum + 0.05) {
    const diff = roundMoney(amount - netSum);
    if (looksLikeVatAmount(diff, netSum)) {
      vatAmount = diff;
    }
  }

  if (vatAmount == null) {
    vatAmount = roundMoney(netSum * DEFAULT_VAT_RATE);
  }

  const vatLine: InvoiceLineItem = fromText ?? {
    label: "MwSt 19%",
    amount: vatAmount,
  };

  const items = [...positions, { ...vatLine, amount: vatAmount }];
  const grossFromItems = roundMoney(netSum + vatAmount);

  return {
    lineItems: items,
    amount: resolveGrossAmount(amount, grossFromItems),
  };
}
