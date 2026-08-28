import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

const VAT_LABEL =
  /\b(?:mwst|m\.?\s*w\.?\s*st\.?|ust\.?|umsatzsteuer|vat)\b/i;

const FOOTER_SUMMARY_LABEL =
  /^(?:gesamtbetrag|nettosumme|netto\s*summe|endsumme|endsummen|zwischensumme|rechnungsbetrag|zahlbetrag|zu\s*zahlen|summe\s*brutto|bruttobetrag|positionssumme)\b/i;

/** Footer total rows — never billable positions. */
export function isInvoiceFooterSummaryLabel(label: string): boolean {
  const trimmed = label.trim().replace(/[:.]+\s*$/, "");
  if (!trimmed) return false;
  if (FOOTER_SUMMARY_LABEL.test(trimmed)) return true;
  if (/^gesamt\s*$/i.test(trimmed)) return true;
  return false;
}

export function stripInvoiceFooterSummaryRows(
  items: InvoiceLineItem[] | null | undefined,
): InvoiceLineItem[] | null {
  if (!items?.length) return items ?? null;
  const filtered = items.filter((item) => !isInvoiceFooterSummaryLabel(item.label));
  return filtered.length > 0 ? filtered : null;
}

function parseLabeledAmount(
  text: string,
  pattern: RegExp,
): number | null {
  const values: number[] = [];
  for (const match of text.matchAll(pattern)) {
    const parsed = parseGermanMoneyAmount(match[1] ?? "");
    if (parsed != null) values.push(parsed);
  }
  return values.length > 0 ? Math.max(...values) : null;
}

/** Nettosumme / Netto Summe / Positionssumme from invoice footer. */
export function extractNetSumFromText(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");
  return (
    parseLabeledAmount(
      text,
      /nettosumme\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*(?:€|eur)?/gi,
    ) ??
    parseLabeledAmount(
      text,
      /netto\s+summe\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*(?:€|eur)?/gi,
    ) ??
    parseLabeledAmount(
      text,
      /positionssumme\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*(?:€|eur)?/gi,
    )
  );
}

/** Gesamtbetrag / Endpreis / Endbetrag brutto from invoice footer. */
export function extractGrossTotalFromText(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");
  return (
    parseLabeledAmount(
      text,
      /gesamtbetrag\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*(?:€|eur)?/gi,
    ) ??
    parseLabeledAmount(
      text,
      /(?:rechnungsbetrag|zahlbetrag|endbetrag)\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*(?:€|eur)?/gi,
    ) ??
    parseLabeledAmount(
      text,
      /endpreis\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*(?:€|eur)?/gi,
    )
  );
}

export const INVOICE_NET_TOTAL_TOLERANCE_EUR = 1.5;

export function sumInvoiceLineItems(
  items: InvoiceLineItem[] | null | undefined,
): number | null {
  if (!items?.length) return null;
  return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
}

/** True when billable rows reconcile with a printed Nettosumme (± tolerance). */
export function invoiceLineItemsMatchNetTotal(
  items: InvoiceLineItem[] | null | undefined,
  netTotal: number | null | undefined,
  tolerance = INVOICE_NET_TOTAL_TOLERANCE_EUR,
): boolean {
  if (!items?.length || netTotal == null) return false;
  const sum = sumInvoiceLineItems(items);
  if (sum == null) return false;
  return Math.abs(sum - netTotal) <= tolerance;
}

/** Drop footer rows and VAT lines before net-position reconciliation. */
export function stripNonPositionInvoiceRows(
  items: InvoiceLineItem[] | null | undefined,
): InvoiceLineItem[] | null {
  if (!items?.length) return items ?? null;
  const filtered = items.filter(
    (item) =>
      !isInvoiceFooterSummaryLabel(item.label) && !VAT_LABEL.test(item.label),
  );
  return filtered.length > 0 ? filtered : null;
}
