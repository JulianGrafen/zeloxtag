import { buildInvoiceDashboardTitle } from "@/lib/documents/invoice-title";
import { preferAmount } from "@/lib/ocr/amount-from-text";
import { inferInvoiceCategory, preferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
import { preferMileageKm } from "@/lib/ocr/mileage-from-text";
import {
  normalizeLineItemsList,
  normalizeTextParseResult,
  type InvoiceTextParseCategory,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import { resolveVendorName } from "@/lib/ocr/vendor-from-text";
import { stripHtmlTags } from "@/lib/ocr/normalize-ocr-markdown";
import type { ParsedInvoice } from "@/types/invoice";

export type MapParsedInvoiceOptions = {
  rawMarkdown: string;
  /** Scan-type locked category (repair/service/tuning). */
  lockedCategory?: InvoiceTextParseCategory | null;
};

function headerLinesFromMarkdown(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => stripHtmlTags(line).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Map hybrid {@link ParsedInvoice} → UI / API {@link InvoiceTextParseResult}.
 */
export function mapParsedInvoiceToTextParseResult(
  invoice: ParsedInvoice,
  options: MapParsedInvoiceOptions,
): InvoiceTextParseResult {
  const rawText = options.rawMarkdown.trim();
  const headerLines = headerLinesFromMarkdown(rawText);
  const fullText = `${headerLines.join("\n")}\n${rawText}`;

  const lineItems = normalizeLineItemsList(
    (invoice.line_items ?? []).map((item) => ({
      label: item.description,
      amount: item.total_price,
    })),
    60,
  );

  const inferredCategory = inferInvoiceCategory(fullText);
  const category = options.lockedCategory
    ? options.lockedCategory
    : preferInvoiceCategory(inferredCategory, fullText);

  const vendor = resolveVendorName({
    structuredVendor: invoice.vendor_name,
    logoCandidates: headerLines.slice(0, 4),
    rawText: fullText,
  });

  const amount = preferAmount(
    invoice.totals.gross_amount ?? invoice.totals.net_amount,
    fullText,
    lineItems,
  );

  const mileageKm = preferMileageKm(invoice.vehicle.mileage, fullText);

  const baseFields = normalizeTextParseResult({
    vendor,
    date: invoice.invoice_date,
    amount,
    category,
    summary: null,
    lineItems,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: null,
    conditions: null,
    partCategory: null,
    notes: null,
    manufacturer: null,
    invoiceNumber: invoice.invoice_number,
    mileageKm,
  });

  const summary = buildInvoiceDashboardTitle({
    summary: null,
    vendor: baseFields.vendor,
    category: baseFields.category,
    lineItems: baseFields.lineItems,
    rawText: fullText,
  });

  return normalizeTextParseResult({
    ...baseFields,
    summary: summary || null,
  });
}
