import { displayDocumentTitle } from "@/lib/documents/format";
import { isOilChangeDocument } from "@/lib/documents/oil-changes";
import { resolveDocumentMileageKm } from "@/lib/documents/document-mileage";
import {
  isManualVehicleEntry,
  isTuningLikeCategory,
} from "@/lib/documents/manual-entries";
import {
  TIMELINE_CATEGORY_LABELS,
  type TimelineEvent,
  type TimelineEventCategory,
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

  if (isManualVehicleEntry(document)) {
    if (isTuningLikeCategory(document.category)) {
      return "part_install";
    }
    return "inspection";
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

function resolveTimelineMileage(document: Document): {
  mileage: number;
  mileageKnown: boolean;
} | null {
  const resolved = resolveDocumentMileageKm(document);
  const hasMileage =
    typeof resolved === "number" && Number.isFinite(resolved) && resolved >= 0;

  if (hasMileage) {
    return { mileage: Math.round(resolved), mileageKnown: true };
  }

  if (isManualVehicleEntry(document)) {
    return { mileage: 0, mileageKnown: false };
  }

  return null;
}

function buildEventTitle(
  document: Document,
  category: TimelineEventCategory,
): string {
  if (isManualVehicleEntry(document)) {
    const custom = displayDocumentTitle(document.title).trim();
    if (custom) return custom.slice(0, 200);
  }
  return TIMELINE_CATEGORY_LABELS[category];
}

/** Secondary line: workshop / short note — never full OCR blobs on scans. */
function buildEventDescription(document: Document): string | null {
  const vendor = document.vendor?.trim();
  if (vendor) return vendor.slice(0, 200);
  if (isManualVehicleEntry(document)) {
    const notes = document.notes?.trim();
    if (notes) return notes.slice(0, 200);
  }
  return null;
}

/**
 * Derive mileage milestones from scanned / saved documents.
 * Scanned docs need KM; manual entries also appear without odometer (date-sorted).
 */
export function deriveTimelineEventsFromDocuments(
  documents: Document[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const document of documents) {
    const mileageState = resolveTimelineMileage(document);
    if (!mileageState) continue;

    const category = timelineCategoryFromDocument(document);

    events.push({
      id: `doc-${document.id}`,
      vehicleId: document.vehicle_id,
      mileage: mileageState.mileage,
      mileageKnown: mileageState.mileageKnown,
      date: resolveEventDate(document),
      category,
      title: buildEventTitle(document, category),
      description: buildEventDescription(document),
      cost:
        typeof document.amount === "number" && Number.isFinite(document.amount)
          ? document.amount
          : null,
      documentId: document.id,
    });
  }

  return events;
}
