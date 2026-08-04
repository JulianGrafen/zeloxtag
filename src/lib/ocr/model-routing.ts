/**
 * Cost vs. accuracy routing for OCR → LLM parse.
 *
 * Invoices need stronger table / line-item attention → mid-tier model.
 * ABE / TÜV stay on the cheap nano deployment.
 */

import type { OcrDocumentType } from "./ocr-types";

/** Default mid-tier deployment for invoice table extraction. */
export const DEFAULT_INVOICE_MODEL = "gpt-5.5-instant";

/** Default economy deployment for ABE / TÜV. */
export const DEFAULT_ECONOMY_MODEL = "gpt-5.4-nano";

function readEnvModel(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Resolve the Foundry / OpenAI chat deployment for a document type.
 * Env overrides:
 * - FOUNDRY_MODEL_INVOICE (or FOUNDRY_MODEL_ACCURACY)
 * - FOUNDRY_MODEL_ECONOMY (or FOUNDRY_MODEL_NAME as legacy fallback)
 */
export function resolveParseModel(documentType: OcrDocumentType): string {
  if (documentType === "invoice") {
    return (
      readEnvModel("FOUNDRY_MODEL_INVOICE") ||
      readEnvModel("FOUNDRY_MODEL_ACCURACY") ||
      DEFAULT_INVOICE_MODEL
    );
  }

  // abe | tuev → cost-efficient nano
  return (
    readEnvModel("FOUNDRY_MODEL_ECONOMY") ||
    readEnvModel("FOUNDRY_MODEL_NAME") ||
    DEFAULT_ECONOMY_MODEL
  );
}

/** Map UI / analyze kind onto OCR document types for routing. */
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
