/** Compact OCR payload sent to domain parse services. */
export type OcrJsonPayload = {
  modelId: string;
  locale: string;
  pageCount: number;
  /** Full reading-order text / Markdown (primary LLM input). */
  text: string;
  /**
   * First 1–2 pages only (ABE cover extract). Prefer page line blocks
   * from Azure DI; falls back to truncated `text`.
   */
  coverText: string;
  /** First-page header lines — often contain logo / workshop name. */
  headerLines: string[];
  /** Azure DI content format used for `text`. */
  contentFormat: "markdown" | "text";
};

/** Which domain parse service should handle the OCR text. */
export type DocumentParseKind = "invoice" | "abe" | "auto";

/**
 * Frontend / API document type for model routing + prompt selection.
 * Distinct from DB `documents.type` (which also includes `other`).
 */
export type OcrDocumentType = "invoice" | "abe" | "tuev";

export const OCR_DOCUMENT_TYPES = ["invoice", "abe", "tuev"] as const;
