/**
 * Back-compat entry for invoice text parsing.
 * Implementation lives in {@link InvoiceParseService}.
 */

export { TextParseError } from "./parse-error";
export { invoiceParseService } from "./services/invoice-parse-service";

import { invoiceParseService } from "./services/invoice-parse-service";
import type { InvoiceTextParseResult } from "./text-parse-schema";

/** @deprecated Prefer `invoiceParseService.parseFromText`. */
export async function extractInvoiceFromText(
  rawText: string,
): Promise<InvoiceTextParseResult> {
  return invoiceParseService.parseFromText(rawText);
}
