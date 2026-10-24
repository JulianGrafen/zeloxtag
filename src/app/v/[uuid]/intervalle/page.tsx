import type { Metadata } from "next";

import { ServiceBookView } from "@/components/service-book";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { loadServiceHistoryForVehicle } from "@/lib/service/load-service-history";
import { latestKnownMileageKm } from "@/lib/vehicles/mileage-velocity";

interface ServiceBookPageProps {
  params: Promise<{ uuid: string }>;
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
  const { uuid } = await params;
  const { result, isDemoShowcase } = await requireTagWriter(uuid, {
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "invoice",
      },
    },
  });

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
    tagUuid: result.tag.uuid,
    feature: FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    children: (
      <ServiceBookView
        vehicleModel={vehicleModel}
        records={records}
        vehicleId={result.vehicle!.id}
        currentMileageKm={currentMileageKm}
        backHref={`/v/${result.tag.uuid}`}
        basePath={`/v/${result.tag.uuid}/intervalle`}
        scanHref={`/v/${result.tag.uuid}?scan=1`}
        tagUuid={result.tag.uuid}
        canAddManual
      />
    ),
  });
}
