import type { DocumentType } from "@/types/database";

export const DOCUMENT_BUCKET = "vehicle-documents";

/** Crowd-sourced cropped Auflagen reference snippets (shared across users). */
export const AUFLAGEN_KUERZEL_BUCKET = "abe-auflagen-kuerzel";

/** Max upload size — room for high-fidelity invoice photos / multi-page PDFs. */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type AllowedDocumentMimeType =
  (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "Rechnung",
  abe: "ABE / Gutachten",
  tuev: "TÜV / HU",
  other: "Sonstiges",
};

export const DOCUMENT_TYPE_OPTIONS: DocumentType[] = [
  "invoice",
  "abe",
  "tuev",
  "other",
];
