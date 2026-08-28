import { buildInvoiceDashboardTitle } from "@/lib/documents/invoice-title";
import { preferAmount } from "@/lib/ocr/amount-from-text";
import { inferInvoiceCategory, preferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
import { preferMileageKm } from "@/lib/ocr/mileage-from-text";
import { resolveWorkshopLineItems } from "@/lib/ocr/invoice-workshop-sections";
import {
  normalizeLineItemsForReview,
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
  /** Workshop name from logo/header vision (hybrid PDF path). */
  visionVendor?: string | null;
  /** Category the model returned; wins over text heuristics when they are unsure. */
  llmCategory?: InvoiceTextParseCategory | null;
  /**
   * Vision path: the positions were already verified against the printed
   * totals, so keep them verbatim instead of re-deriving them from OCR text.
   */
  llmAuthoritative?: boolean;
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

  const mappedItems = (invoice.line_items ?? []).map((item) => ({
    label: item.description,
    amount: item.total_price,
  }));
  const lineItems = options.llmAuthoritative
    ? normalizeLineItemsForReview(mappedItems, 60)
    : normalizeLineItemsList(
        resolveWorkshopLineItems({
          llmItems: mappedItems,
          ocrText: rawText,
        }) ?? mappedItems,
        60,
      );

  const category = options.lockedCategory
    ? options.lockedCategory
    : preferInvoiceCategory(
        options.llmCategory ?? inferInvoiceCategory(fullText),
        fullText,
      );

  const vendor = resolveVendorName({
    structuredVendor: invoice.vendor_name,
    logoCandidates: headerLines.slice(0, 4),
    visionVendor: options.visionVendor,
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
