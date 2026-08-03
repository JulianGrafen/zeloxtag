import type { Document, DocumentType } from "@/types/database";

import { DOCUMENT_TYPE_LABELS } from "./constants";

export function formatDocumentDate(isoDate: string | null): string {
  if (!isoDate) return "Ohne Datum";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDocumentAmount(amount: number | null): string | null {
  if (amount === null || Number.isNaN(amount)) return null;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type];
}

/** Strip legacy OCR category prefixes like `[repair]` from stored titles. */
export function displayDocumentTitle(title: string): string {
  return title.replace(/^\[[a-z_]+\]\s*/i, "").trim() || title;
}

export function filterDocumentsByType(
  documents: Document[],
  type?: DocumentType | "all",
): Document[] {
  if (!type || type === "all") return documents;
  return documents.filter((doc) => doc.type === type);
}

export function sumInvoiceAmounts(documents: Document[]): number {
  return documents
    .filter((doc) => doc.type === "invoice" && doc.amount !== null)
    .reduce((sum, doc) => sum + (doc.amount ?? 0), 0);
}
