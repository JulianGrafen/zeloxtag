import type { Document } from "@/types/database";

export const MANUAL_ENTRY_CATEGORIES = ["service", "tuning"] as const;
export type ManualEntryCategory = (typeof MANUAL_ENTRY_CATEGORIES)[number];

/** UI categories for the free-tier manual service entry form. */
export const MANUAL_SERVICE_ENTRY_TYPES = [
  "oil_change",
  "service",
  "brakes",
  "tuning_part",
  "other",
] as const;

export type ManualServiceEntryType = (typeof MANUAL_SERVICE_ENTRY_TYPES)[number];

export const MANUAL_SERVICE_ENTRY_LABELS: Record<
  ManualServiceEntryType,
  string
> = {
  oil_change: "Ölwechsel",
  service: "Service / Inspektion",
  brakes: "Bremsen",
  tuning_part: "Tuning-Teil",
  other: "Sonstiges",
};

export const DOCUMENT_ENTRY_SOURCE = {
  MANUAL: "MANUAL",
  AI_SCAN: "AI_SCAN",
} as const;

export type DocumentEntrySource =
  (typeof DOCUMENT_ENTRY_SOURCE)[keyof typeof DOCUMENT_ENTRY_SOURCE];

export const MANUAL_ENTRY_CATEGORY_LABELS: Record<ManualEntryCategory, string> =
  {
    service: "Wartung / Service",
    tuning: "Tuning / Umbau",
  };

/**
 * Stable marker in `invoice_number` so manual entries stay identifiable
 * after `file_url` becomes a real Storage URL (photo / PDF).
 */
export const MANUAL_ENTRY_MARKER = "__manual__";

/** Max photos attached to one manual entry (client + server). */
export const MANUAL_ENTRY_MAX_PHOTOS = 8;

export function isManualEntryUrl(fileUrl: string | null | undefined): boolean {
  return Boolean(fileUrl?.startsWith("manual://"));
}

export function isManualEntryMarker(
  invoiceNumber: string | null | undefined,
): boolean {
  return invoiceNumber === MANUAL_ENTRY_MARKER;
}

export function isManualVehicleEntry(document: Document): boolean {
  return (
    isManualEntryMarker(document.invoice_number) ||
    isManualEntryUrl(document.file_url)
  );
}

export function documentEntrySource(document: Document): DocumentEntrySource {
  return isManualVehicleEntry(document)
    ? DOCUMENT_ENTRY_SOURCE.MANUAL
    : DOCUMENT_ENTRY_SOURCE.AI_SCAN;
}

/** Hide internal marker from UI / share text. */
export function displayManualInvoiceNumber(
  invoiceNumber: string | null | undefined,
): string | null {
  if (!invoiceNumber || isManualEntryMarker(invoiceNumber)) return null;
  return invoiceNumber;
}

export function filterManualVehicleEntries(documents: Document[]): Document[] {
  return documents
    .filter(isManualVehicleEntry)
    .sort((a, b) => {
      const aDate = a.date ?? a.created_at;
      const bDate = b.date ?? b.created_at;
      return bDate.localeCompare(aDate);
    });
}

export function parseManualEntryCategory(
  value: string | null | undefined,
): ManualEntryCategory | null {
  if (!value) return null;
  return (MANUAL_ENTRY_CATEGORIES as readonly string[]).includes(value)
    ? (value as ManualEntryCategory)
    : null;
}

/** True for stored `tuning` and OCR/UI labels like "Tuning / Umbau". */
export function isTuningLikeCategory(
  value: string | null | undefined,
): boolean {
  if (parseManualEntryCategory(value) === "tuning") return true;
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  return /tuning|umbau/.test(normalized);
}
