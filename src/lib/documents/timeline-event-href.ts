import { isOilChangeDocument } from "@/lib/documents/oil-changes";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { TimelineEvent } from "@/lib/validations/timelineSchema";
import type { Document } from "@/types/database";

/** Resolve navigation target for a chronik row (document detail or interval view). */
export function resolveTimelineDocumentHref(
  documentId: string,
  documents: Document[],
  scope: VehicleSurfaceScope,
): string {
  const document = documents.find((doc) => doc.id === documentId);
  if (document && isOilChangeDocument(document)) {
    return vehicleSurfaceHref(scope, `intervalle/${documentId}`);
  }
  return vehicleSurfaceHref(scope, `dokumente/${documentId}`);
}

export function resolveTimelineEventDocumentHref(
  event: TimelineEvent,
  documentHref: (documentId: string) => string,
): string | null {
  if (!event.documentId) return null;
  return documentHref(event.documentId);
}
