/**
 * Foundry chat deployment for OCR → LLM parse.
 * All document types (invoice, ABE, TÜV) use GPT-5.4.
 */

import type { OcrDocumentType } from "./ocr-types";

/** Single default deployment for every parse path. */
export const DEFAULT_PARSE_MODEL = "gpt-5.4-nano";

/** @deprecated Use {@link DEFAULT_PARSE_MODEL}. */
export const DEFAULT_INVOICE_MODEL = DEFAULT_PARSE_MODEL;

/** @deprecated Use {@link DEFAULT_PARSE_MODEL}. */
export const DEFAULT_ECONOMY_MODEL = DEFAULT_PARSE_MODEL;

function readEnvModel(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Resolve the Foundry / OpenAI chat deployment.
 * Always GPT-5.4 — `documentType` is kept for call-site compatibility.
 * Env: `FOUNDRY_MODEL_NAME` (preferred) or `FOUNDRY_MODEL_ECONOMY`.
 */
export function resolveParseModel(_documentType: OcrDocumentType): string {
  return (
    readEnvModel("FOUNDRY_MODEL_NAME") ||
    readEnvModel("FOUNDRY_MODEL_ECONOMY") ||
    readEnvModel("FOUNDRY_MODEL_INVOICE") ||
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
