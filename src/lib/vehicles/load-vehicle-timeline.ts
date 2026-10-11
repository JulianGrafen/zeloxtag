import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  buildTimelineFromDocuments,
  TimelineService,
  type TimelineMileageOrder,
} from "@/services/timeline";
import type { TimelineEvent } from "@/lib/validations/timelineSchema";
import type { Document } from "@/types/database";

/**
 * Vehicle timeline for dashboard and /historie — stored events merged with documents.
 */
export async function loadVehicleTimelineEvents(
  vehicleId: string,
  documents: Document[],
  order: TimelineMileageOrder = "desc",
): Promise<TimelineEvent[]> {
  let events = buildTimelineFromDocuments(documents, order);

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return events;
  }

  try {
    const supabase = await createClient();
    const timeline = new TimelineService(supabase);
    events = await timeline.getTimelineForVehicle(vehicleId, documents, order);
  } catch {
    // Fall back to document-derived timeline (already set).
  }

  return events;
}
