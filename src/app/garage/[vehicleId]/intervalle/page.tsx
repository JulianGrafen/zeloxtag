import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";

import { ServiceBookView } from "@/components/service-book";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { loadServiceHistoryForVehicle } from "@/lib/service/load-service-history";
import { latestKnownMileageKm } from "@/lib/vehicles/mileage-velocity";

interface ServiceBookPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Service & Wartung · ZeloxTag",
    description: "Digitales Scheckheft für diesen ZeloxTag.",
  };
}

export default async function VehicleServiceBookPage({
  params,
}: ServiceBookPageProps) {
  const { vehicleId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceWriter(
    { vehicleId },
    {
      load: {
        documents: {
          mode: "types",
          types: ["invoice"],
          columns: "invoice",
        },
      },
    },
  );

  const records = await loadServiceHistoryForVehicle(
    result.vehicle!.id,
    result.documents,
    result.vehicle!.tech_specs,
  );
  const vehicleModel = `${result.vehicle!.make} ${result.vehicle!.model}`;
  const currentMileageKm = latestKnownMileageKm(result.documents);

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: scope.linkedTagUuid ?? vehicleId,
    feature: FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    children: (
      <ServiceBookView
        vehicleModel={vehicleModel}
        records={records}
        vehicleId={result.vehicle!.id}
        currentMileageKm={currentMileageKm}
        backHref={`${vehicleSurfaceHref(scope)}`}
        basePath={`${vehicleSurfaceHref(scope, `intervalle`)}`}
        scanHref={`${vehicleSurfaceHref(scope, `?scan=1`)}`}
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        canAddManual
      />
    ),
  });
}
