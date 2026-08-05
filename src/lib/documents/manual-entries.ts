import type { Document } from "@/types/database";

export const MANUAL_ENTRY_CATEGORIES = ["service", "tuning"] as const;
export type ManualEntryCategory = (typeof MANUAL_ENTRY_CATEGORIES)[number];

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
