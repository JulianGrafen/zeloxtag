import type { Metadata } from "next";

import { VehicleTimelineView } from "@/components/documents/vehicle-timeline-view";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { loadVehicleTimelineEvents } from "@/lib/vehicles/load-vehicle-timeline";

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

  const events = await loadVehicleTimelineEvents(
    vehicle.id,
    documents,
    "desc",
  );

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
        documents={documents}
        scanHref={`/v/${result.tag.uuid}/service?scan=1`}
        backHref={`/v/${result.tag.uuid}`}
      />
    ),
  });
}
