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

  // Prefer caller-provided summary; dashboard titles for invoices should use
  // `buildInvoiceDashboardTitle` (line items / dominant work).
  const base =
    input.summary?.trim() ||
    input.vendor?.trim() ||
    "Rechnung";

  return base.slice(0, 160);
}

/**
 * ABE list/detail title: "Hersteller Modell" (e.g. "BBS Superleggera").
 * Avoids duplicating the brand if the model already starts with it.
 */
export function titleFromAbeFields(input: {
  manufacturer: string | null | undefined;
  partType: string | null | undefined;
}): string {
  const manufacturer = input.manufacturer?.trim() ?? "";
  const partType = input.partType?.trim() ?? "";

  if (manufacturer && partType) {
    const brandPrefix = manufacturer.toLowerCase();
    const modelAlreadyIncludesBrand = partType
      .toLowerCase()
      .startsWith(brandPrefix);
    const combined = modelAlreadyIncludesBrand
      ? partType
      : `${manufacturer} ${partType}`;
    return combined.slice(0, 160);
  }

  return (partType || manufacturer || "ABE").slice(0, 160);
}
