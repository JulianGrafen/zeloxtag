/**
 * Foundry chat deployment for OCR → LLM parse.
 * Invoices use GPT-5.4; ABE/TÜV default to GPT-5.4-nano unless overridden.
 * ABE Verwendungsbereich table vision uses GPT-5.4 (FOUNDRY_MODEL_ABE_TABLE).
 */

import type { OcrDocumentType } from "./ocr-types";

/** Default for ABE (non-table), TÜV, and other non-invoice parse paths. */
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

function isTruthyEnv(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function isEconomyNanoModel(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    normalized === DEFAULT_PARSE_MODEL.toLowerCase() ||
    normalized.endsWith("-nano") ||
    normalized.includes(".nano")
  );
}

/**
 * When `INVOICE_USE_NANO=true`, invoices route to {@link DEFAULT_PARSE_MODEL}
 * for cost/quality A/B tests. Production default remains GPT-5.4.
 */
export function isInvoiceNanoTestMode(): boolean {
  return isTruthyEnv("INVOICE_USE_NANO");
}

/** Full-capability model for invoice vision extraction — never nano unless test flag. */
export function resolveInvoiceParseModel(): string {
  const env = readEnvModel("FOUNDRY_MODEL_INVOICE");
  if (env && !isEconomyNanoModel(env)) return env;
  if (isInvoiceNanoTestMode()) return DEFAULT_PARSE_MODEL;
  return DEFAULT_INVOICE_PARSE_MODEL;
}

/**
 * Resolve the Foundry / OpenAI chat deployment for a document type.
 *
 * Invoice: {@link resolveInvoiceParseModel} → `gpt-5.4` (or nano when `INVOICE_USE_NANO=true`)
 * Other: `FOUNDRY_MODEL_NAME` → `FOUNDRY_MODEL_ECONOMY` → `gpt-5.4-nano`
 */
export function resolveParseModel(documentType: OcrDocumentType): string {
  if (documentType === "invoice") {
    return resolveInvoiceParseModel();
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
