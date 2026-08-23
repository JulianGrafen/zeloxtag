import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapVehicleEventRowToTimelineEvent,
  TimelineEventSchema,
  VehicleEventRowSchema,
  type TimelineEvent,
} from "@/lib/validations/timelineSchema";
import type { Database, Document } from "@/types/database";

import { deriveTimelineEventsFromDocuments } from "./derive-timeline-from-documents";

export type TimelineMileageOrder = "asc" | "desc";

type TimelineSupabase = SupabaseClient<Database>;

/**
 * Sort timeline events strictly by mileage (then date as tie-breaker).
 * Default: descending — highest / latest KM at the top.
 */
export function sortTimelineEventsByMileage(
  events: TimelineEvent[],
  order: TimelineMileageOrder = "desc",
): TimelineEvent[] {
  const direction = order === "desc" ? -1 : 1;
  return [...events].sort((a, b) => {
    if (a.mileage !== b.mileage) {
      return a.mileage < b.mileage ? -direction : direction;
    }
    // Stable secondary: newer date first when desc, older first when asc.
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp * (order === "desc" ? -1 : 1);
    return a.id.localeCompare(b.id);
  });
}

/**
 * Merge stored `vehicle_events` with document-derived milestones.
 * Document-linked rows win — `documents` (+ approval_fields) are the source of truth.
 */
export function mergeTimelineEvents(
  stored: TimelineEvent[],
  derived: TimelineEvent[],
): TimelineEvent[] {
  const byDocumentId = new Map<string, TimelineEvent>();
  const withoutDocument: TimelineEvent[] = [];

  for (const event of derived) {
    const docId = event.documentId;
    if (docId) {
      byDocumentId.set(docId, event);
    } else {
      withoutDocument.push(event);
    }
  }

  for (const event of stored) {
    const docId = event.documentId;
    if (!docId) {
      withoutDocument.push(event);
      continue;
    }
    if (!byDocumentId.has(docId)) {
      byDocumentId.set(docId, event);
    }
  }

  return [...withoutDocument, ...byDocumentId.values()];
}

function parseStoredRows(rows: unknown[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const raw of rows) {
    const row = VehicleEventRowSchema.safeParse(raw);
    if (!row.success) continue;
    const mapped = TimelineEventSchema.safeParse(
      mapVehicleEventRowToTimelineEvent(row.data),
    );
    if (mapped.success) {
      events.push(mapped.data);
    }
  }
  return events;
}

/**
 * Fetch / assemble mileage-ordered Service Timeline events for a vehicle.
 */
export class TimelineService {
  constructor(private readonly supabase: TimelineSupabase) {}

  /**
   * Load events from `vehicle_events`, sorted by mileage.
   */
  async fetchEventsForVehicle(
    vehicleId: string,
    order: TimelineMileageOrder = "desc",
  ): Promise<TimelineEvent[]> {
    const trimmed = vehicleId.trim();
    if (!trimmed) return [];

    const ascending = order === "asc";
    const { data, error } = await this.supabase
      .from("vehicle_events")
      .select(
        "id, vehicle_id, mileage, date, category, title, description, cost, document_id",
      )
      .eq("vehicle_id", trimmed)
      .order("mileage", { ascending })
      .order("date", { ascending });

    if (error) {
      throw new Error(`TimelineService: ${error.message}`);
    }

    return parseStoredRows(data ?? []);
  }

  /**
   * Full timeline: stored events + milestones derived from scans/documents.
   * Sorted strictly by mileage (default descending).
   */
  async getTimelineForVehicle(
    vehicleId: string,
    documents: Document[],
    order: TimelineMileageOrder = "desc",
  ): Promise<TimelineEvent[]> {
    let stored: TimelineEvent[] = [];
    try {
      stored = await this.fetchEventsForVehicle(vehicleId, order);
    } catch (error) {
      // Table may be missing before migration — still show document-derived events.
      console.error(
        "[TimelineService] vehicle_events fetch failed",
        error instanceof Error ? error.message : "unknown",
      );
    }

    const derived = deriveTimelineEventsFromDocuments(
      documents.filter((doc) => doc.vehicle_id === vehicleId),
    );
    return sortTimelineEventsByMileage(
      mergeTimelineEvents(stored, derived),
      order,
    );
  }
}

/**
 * Build a document-only timeline (demo / offline / already-loaded tag payload).
 */
export function buildTimelineFromDocuments(
  documents: Document[],
  order: TimelineMileageOrder = "desc",
): TimelineEvent[] {
  return sortTimelineEventsByMileage(
    deriveTimelineEventsFromDocuments(documents),
    order,
  );
}
