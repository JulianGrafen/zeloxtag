import type { Metadata } from "next";

import { VehicleTimelineView } from "@/components/documents/vehicle-timeline-view";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  buildTimelineFromDocuments,
  TimelineService,
} from "@/services/timeline";

interface HistoriePageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Timeline · ZeloxTag",
    description:
      "Service- & Wartungshistorie nach Kilometerstand für diesen ZeloxTag.",
  };
}

export default async function VehicleHistoriePage({
  params,
}: HistoriePageProps) {
  const { uuid } = await params;
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid);
  const vehicle = result.vehicle!;
  const documents =
    access.isContributor && !access.isOwner
      ? result.documents.filter((doc) => doc.type === "invoice")
      : result.documents;

  const { isConfigured } = getSupabaseEnv();
  let events = buildTimelineFromDocuments(documents, "desc");

  if (isConfigured) {
    try {
      const supabase = await createClient();
      const timeline = new TimelineService(supabase);
      events = await timeline.getTimelineForVehicle(
        vehicle.id,
        documents,
        "desc",
      );
    } catch {
      // Fall back to document-derived timeline (already set).
    }
  }

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: vehicle.user_id,
    tagUuid: result.tag.uuid,
    feature: FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    children: (
      <VehicleTimelineView
        tagUuid={result.tag.uuid}
        vehicleLabel={`${vehicle.make} ${vehicle.model}${
          vehicle.year ? ` · ${vehicle.year}` : ""
        }`}
        events={events}
        scanHref={`/v/${result.tag.uuid}/service?scan=1`}
        backHref={`/v/${result.tag.uuid}`}
      />
    ),
  });
}
