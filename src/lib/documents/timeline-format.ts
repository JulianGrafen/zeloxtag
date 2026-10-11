import { formatDocumentAmount, formatDocumentDate } from "@/lib/documents/format";
import type { TimelineEvent } from "@/lib/validations/timelineSchema";

/** e.g. 142500 → "142.500 km"; unknown manual entries → "km unbekannt". */
export function formatTimelineMileage(
  mileage: number,
  options?: { known?: boolean },
): string {
  if (options?.known === false) return "km unbekannt";
  if (!Number.isFinite(mileage) || mileage < 0) return "— km";
  return `${Math.round(mileage).toLocaleString("de-DE")} km`;
}

export function formatTimelineDate(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) return "Ohne Datum";
  return formatDocumentDate(isoDate);
}

/** Chronik header, e.g. "14. Okt 2026". */
export function formatTimelineChronikDate(
  isoDate: string | null | undefined,
): string {
  if (!isoDate?.trim()) return "Ohne Datum";
  const normalized = isoDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return formatDocumentDate(isoDate);
  }
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return formatDocumentDate(isoDate);
  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimelineCost(
  cost: TimelineEvent["cost"] | null | undefined,
): string | null {
  if (cost === null || cost === undefined) return null;
  return formatDocumentAmount(cost);
}
