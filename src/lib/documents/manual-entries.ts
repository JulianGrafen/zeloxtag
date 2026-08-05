import type { Document } from "@/types/database";

export const MANUAL_ENTRY_CATEGORIES = ["service", "tuning"] as const;
export type ManualEntryCategory = (typeof MANUAL_ENTRY_CATEGORIES)[number];

export const MANUAL_ENTRY_CATEGORY_LABELS: Record<ManualEntryCategory, string> =
  {
    service: "Wartung / Service",
    tuning: "Tuning / Umbau",
  };

export function isManualEntryUrl(fileUrl: string | null | undefined): boolean {
  return Boolean(fileUrl?.startsWith("manual://"));
}

export function isManualVehicleEntry(document: Document): boolean {
  return isManualEntryUrl(document.file_url);
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
