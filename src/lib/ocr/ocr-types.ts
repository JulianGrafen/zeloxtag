/** Compact OCR payload sent to domain parse services. */
export type OcrJsonPayload = {
  modelId: string;
  locale: string;
  pageCount: number;
  /** Full reading-order text (primary input for the LLM). */
  text: string;
  /** First-page header lines — often contain logo / workshop name. */
  headerLines: string[];
};

/** Which domain parse service should handle the OCR text. */
export type DocumentParseKind = "invoice" | "abe" | "auto";
