import type { DocumentType } from "@/types/database";

export const DOCUMENT_BUCKET = "vehicle-documents";

/** Crowd-sourced cropped Auflagen reference snippets (shared across users). */
export const AUFLAGEN_KUERZEL_BUCKET = "abe-auflagen-kuerzel";

/** Same-origin paper-snippet bytes (shared reference crops, not vehicle files). */
export const AUFLAGEN_KUERZEL_IMAGE_API_PATH =
  "/api/abe/auflagen-kuerzel/image";

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

/** Noun used in delete button + confirm dialog per document type. */
export const DOCUMENT_DELETE_NOUNS: Record<DocumentType, string> = {
  invoice: "Rechnung",
  abe: "ABE",
  tuev: "TÜV-Bericht",
  other: "Dokument",
};

export function documentDeleteButtonLabel(type: DocumentType): string {
  return `${DOCUMENT_DELETE_NOUNS[type]} löschen`;
}

export function documentDeleteConfirmMessage(
  type: DocumentType,
  title: string,
): string {
  return `${DOCUMENT_DELETE_NOUNS[type]} „${title}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`;
}

export const DOCUMENT_TYPE_OPTIONS: DocumentType[] = [
  "invoice",
  "abe",
  "tuev",
  "other",
];
