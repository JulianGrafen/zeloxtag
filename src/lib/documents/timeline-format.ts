import { formatDocumentAmount, formatDocumentDate } from "@/lib/documents/format";
import type { TimelineEvent } from "@/lib/validations/timelineSchema";

/** e.g. 142500 → "142.500 km" */
export function formatTimelineMileage(mileage: number): string {
  if (!Number.isFinite(mileage) || mileage < 0) return "— km";
  return `${Math.round(mileage).toLocaleString("de-DE")} km`;
}

export function formatTimelineDate(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) return "Ohne Datum";
  return formatDocumentDate(isoDate);
}

export function formatTimelineCost(
  cost: TimelineEvent["cost"] | null | undefined,
): string | null {
  if (cost === null || cost === undefined) return null;
  return formatDocumentAmount(cost);
}
