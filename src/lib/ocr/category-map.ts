import type { DocumentType } from "@/types/database";

import type { InvoiceTextParseCategory } from "./text-parse-schema";

/** Map hybrid OCR categories onto `documents.type`. */
export function documentTypeForTextCategory(
  category: InvoiceTextParseCategory,
): DocumentType {
  if (category === "tuev") return "tuev";
  if (category === "abe") return "abe";
  if (category === "other") return "other";
  return "invoice";
}

export function titleFromParsedInvoice(input: {
  summary: string | null;
  vendor: string | null;
  category: InvoiceTextParseCategory;
}): string {
  // ABE: Bauteilname (stored in vendor) is the primary list title.
  if (input.category === "abe") {
    return (
      input.vendor?.trim() ||
      input.summary?.trim() ||
      "ABE"
    ).slice(0, 160);
  }

  const base =
    input.summary?.trim() ||
    input.vendor?.trim() ||
    "Rechnung";

  return base.slice(0, 160);
}
