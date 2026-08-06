import { displayDocumentTitle } from "@/lib/documents/format";
import { isOilChangeDocument } from "@/lib/documents/oil-changes";
import { isManualVehicleEntry } from "@/lib/documents/manual-entries";
import type {
  TimelineEvent,
  TimelineEventCategory,
} from "@/lib/validations/timelineSchema";
import type { Document } from "@/types/database";

/**
 * Map a stored document → timeline category.
 * Oil changes win over generic service; TÜV / ABE / invoices follow type+category.
 */
export function timelineCategoryFromDocument(
  document: Document,
): TimelineEventCategory {
  if (document.type === "tuev" || document.category === "tuev") {
    return "tuev";
  }

  if (isOilChangeDocument(document)) {
    return "oil_change";
  }

  const category = document.category?.toLowerCase() ?? "";

  if (category === "repair") return "repair";
  if (category === "service" || category === "inspection") {
    return "inspection";
  }
  if (
    category === "tuning" ||
    document.type === "abe" ||
    document.part_category
  ) {
    return "part_install";
  }

  if (isManualVehicleEntry(document) && category === "tuning") {
    return "part_install";
  }

  return "other";
}

function resolveEventDate(document: Document): string {
  const fromDoc = document.date?.trim();
  if (fromDoc && /^\d{4}-\d{2}-\d{2}$/.test(fromDoc)) {
    return fromDoc;
  }
  const created = document.created_at?.slice(0, 10);
  if (created && /^\d{4}-\d{2}-\d{2}$/.test(created)) {
    return created;
  }
  return "1970-01-01";
}

function buildDescription(document: Document): string | null {
  const parts = [
    document.vendor?.trim() || null,
    document.notes?.trim() || null,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;
  return parts.join(" · ").slice(0, 4_000);
}

/**
 * Derive mileage milestones from scanned / saved documents.
 * Documents without a positive `mileage_km` are omitted (timeline is KM-first).
 */
export function deriveTimelineEventsFromDocuments(
  documents: Document[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const document of documents) {
    const mileage = document.mileage_km;
    if (typeof mileage !== "number" || !Number.isFinite(mileage) || mileage < 0) {
      continue;
    }

    const title = displayDocumentTitle(document.title).slice(0, 200);
    if (!title) continue;

    events.push({
      id: `doc-${document.id}`,
      vehicleId: document.vehicle_id,
      mileage: Math.round(mileage),
      date: resolveEventDate(document),
      category: timelineCategoryFromDocument(document),
      title,
      description: buildDescription(document),
      cost:
        typeof document.amount === "number" && Number.isFinite(document.amount)
          ? document.amount
          : null,
      documentId: document.id,
    });
  }

  return events;
}
