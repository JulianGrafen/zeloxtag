import type { Document, DocumentType } from "@/types/database";

import { DOCUMENT_TYPE_LABELS } from "./constants";

/** TÜV next-HU month (YYYY-MM) → e.g. "Mai 2028". */
export function formatTuevYearMonth(ym: string | null): string {
  if (!ym?.trim()) return "—";
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yearStr, monthStr] = ym.split("-");
  const year = Number.parseInt(yearStr!, 10);
  const month = Number.parseInt(monthStr!, 10);
  if (!year || month < 1 || month > 12) return ym;
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
    "de-DE",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

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

/** Local calendar date as YYYY-MM-DD (scan date, not UTC-shifted). */
export function localDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
