/**
 * Foundry chat deployment for OCR → LLM parse.
 * Invoices use GPT-5.4; ABE/TÜV default to GPT-5.4-nano unless overridden.
 */

import type { OcrDocumentType } from "./ocr-types";

/** Default for ABE, TÜV, and other non-invoice parse paths. */
export const DEFAULT_PARSE_MODEL = "gpt-5.4-nano";

/** Default for invoice extraction (wizard, upload, line items). */
export const DEFAULT_INVOICE_PARSE_MODEL = "gpt-5.4";

/** @deprecated Use {@link DEFAULT_INVOICE_PARSE_MODEL} for invoices. */
export const DEFAULT_INVOICE_MODEL = DEFAULT_INVOICE_PARSE_MODEL;

/** @deprecated Use {@link DEFAULT_PARSE_MODEL}. */
export const DEFAULT_ECONOMY_MODEL = DEFAULT_PARSE_MODEL;

function readEnvModel(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Resolve the Foundry / OpenAI chat deployment for a document type.
 *
 * Invoice: `FOUNDRY_MODEL_INVOICE` → `gpt-5.4`
 * Other: `FOUNDRY_MODEL_NAME` → `FOUNDRY_MODEL_ECONOMY` → `gpt-5.4-nano`
 */
export function resolveParseModel(documentType: OcrDocumentType): string {
  if (documentType === "invoice") {
    return readEnvModel("FOUNDRY_MODEL_INVOICE") || DEFAULT_INVOICE_PARSE_MODEL;
  }

  return (
    readEnvModel("FOUNDRY_MODEL_NAME") ||
    readEnvModel("FOUNDRY_MODEL_ECONOMY") ||
    DEFAULT_PARSE_MODEL
  );
}

/** Map UI / analyze kind onto OCR document types for service dispatch. */
export function documentTypeFromParseKind(
  kind: "invoice" | "abe" | "auto",
  inferredCategory?: string,
): OcrDocumentType {
  if (kind === "abe") return "abe";
  if (kind === "invoice") return "invoice";
  if (inferredCategory === "abe") return "abe";
  if (inferredCategory === "tuev") return "tuev";
  return "invoice";
}
