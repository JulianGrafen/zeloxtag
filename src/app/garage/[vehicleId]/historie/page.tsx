import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";

import { VehicleTimelineView } from "@/components/documents/vehicle-timeline-view";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { loadVehicleTimelineEvents } from "@/lib/vehicles/load-vehicle-timeline";

interface HistoriePageProps {
  params: Promise<{ vehicleId: string }>;
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
  const { vehicleId } = await params;
  const { scope, result, access, isDemoShowcase } = await requireVehicleSurfaceWriter({ vehicleId });
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
    tagUuid: scope.linkedTagUuid ?? vehicleId,
    feature: FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    children: (
      <VehicleTimelineView
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleLabel={`${vehicle.make} ${vehicle.model}${
          vehicle.year ? ` · ${vehicle.year}` : ""
        }`}
        events={events}
        documents={documents}
        scanHref={`${vehicleSurfaceHref(scope, `service?scan=1`)}`}
        backHref={`${vehicleSurfaceHref(scope)}`}
      />
    ),
  });
}
