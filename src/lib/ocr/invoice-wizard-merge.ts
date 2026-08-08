import { preferAmount } from "@/lib/ocr/amount-from-text";
import { preferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
import { extractMileageKmFromText } from "@/lib/ocr/mileage-from-text";
import {
  coerceLooseNumber,
  normalizeLineItemsList,
  normalizeTextParseResult,
  type InvoiceLineItem,
  type InvoiceTextParseCategory,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";

const LINE_ITEMS_MAX_COUNT = 60;
const MIN_KM = 500;
const MAX_KM = 9_999_999;

export type InvoiceOverviewExtraction = {
  vendor: string | null;
  date: string | null;
  amount: number | null;
  category: InvoiceTextParseCategory;
  summary: string | null;
};

export type InvoiceHeaderExtraction = {
  vendor: string | null;
  invoiceNumber: string | null;
  mileageKm: number | null;
  date: string | null;
};

export type InvoiceLineItemsExtraction = {
  lineItems: InvoiceLineItem[] | null;
  amount: number | null;
};

/** Reject common LLM mileage mistakes (decimals, invoice #, out of range). */
export function sanitizeInvoiceMileageKm(
  value: number | null | undefined,
  invoiceNumber: string | null,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;

  const rounded = Math.round(value);
  if (Math.abs(value - rounded) > 0.001) return null;
  if (rounded < MIN_KM || rounded > MAX_KM) return null;

  if (invoiceNumber) {
    const invDigits = invoiceNumber.replace(/\D/g, "");
    if (invDigits.length >= 4 && invDigits === String(rounded)) return null;
  }

  return rounded;
}

function parseHeaderMileage(
  raw: unknown,
  invoiceNumber: string | null,
): number | null {
  if (typeof raw === "string" && raw.trim()) {
    const fromText = extractMileageKmFromText(raw);
    const sanitized = sanitizeInvoiceMileageKm(fromText, invoiceNumber);
    if (sanitized !== null) return sanitized;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const sanitized = sanitizeInvoiceMileageKm(raw, invoiceNumber);
    if (sanitized !== null) return sanitized;
  }

  const coerced = coerceLooseNumber(raw);
  return sanitizeInvoiceMileageKm(coerced, invoiceNumber);
}

/** Merge multiple position-block scans (multi-page invoices). */
export function mergeLineItemsExtractions(
  blocks: InvoiceLineItemsExtraction[],
): InvoiceLineItemsExtraction {
  if (blocks.length === 0) {
    return { lineItems: null, amount: null };
  }
  if (blocks.length === 1) {
    return blocks[0]!;
  }

  const seen = new Set<string>();
  const merged: InvoiceLineItem[] = [];

  for (const block of blocks) {
    for (const item of block.lineItems ?? []) {
      const key = `${item.label.trim().toLowerCase()}|${item.amount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  const lineItems = normalizeLineItemsList(merged, LINE_ITEMS_MAX_COUNT);
  const amount =
    blocks.map((block) => block.amount).find((value) => value !== null) ??
    null;

  return {
    lineItems: realignShiftedInvoiceLineItems(lineItems, amount),
    amount,
  };
}

/**
 * Merge guided wizard extractions into a single review payload.
 * Line items come exclusively from the dedicated positions scan (LLM pass).
 */
export function mergeInvoiceWizardExtractions(
  overview: InvoiceOverviewExtraction | null,
  header: InvoiceHeaderExtraction,
  lineItemsBlock: InvoiceLineItemsExtraction,
  options: { lockedCategory?: InvoiceTextParseCategory | null } = {},
): InvoiceTextParseResult {
  const vendor = header.vendor ?? overview?.vendor ?? null;
  const date = header.date ?? overview?.date ?? null;
  const lineItems = lineItemsBlock.lineItems;
  const categorySeed = [
    overview?.summary,
    overview?.category,
    vendor,
    lineItems?.map((item) => item.label).join(" "),
  ]
    .filter(Boolean)
    .join("\n");

  const category = options.lockedCategory
    ? options.lockedCategory
    : preferInvoiceCategory(overview?.category ?? "other", categorySeed);

  const amount = preferAmount(
    lineItemsBlock.amount ?? overview?.amount ?? null,
    "",
    lineItems,
  );

  const mileageKm = sanitizeInvoiceMileageKm(
    parseHeaderMileage(header.mileageKm, header.invoiceNumber),
    header.invoiceNumber,
  );

  return normalizeTextParseResult({
    vendor,
    date,
    amount,
    category: category === "abe" ? "other" : category,
    summary: overview?.summary ?? null,
    lineItems,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: null,
    conditions: null,
    partCategory: null,
    notes: null,
    manufacturer: null,
    invoiceNumber: header.invoiceNumber,
    mileageKm,
  });
}
