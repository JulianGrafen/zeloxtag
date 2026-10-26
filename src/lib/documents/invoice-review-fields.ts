import type { InvoiceTextParseCategory } from "@/lib/ocr/text-parse-schema";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

export function emptyInvoiceReviewFields(
  category: InvoiceTextParseCategory = "service",
): InvoiceTextParseResult {
  return {
    vendor: null,
    date: null,
    amount: null,
    category,
    summary: null,
    topicTags: [],
    lineItems: null,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: null,
    conditions: null,
    partCategory: null,
    notes: null,
    manufacturer: null,
    invoiceNumber: null,
    mileageKm: null,
  };
}
