import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";

import { OilIntervalsView } from "@/components/vehicle-dashboard";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
import { brakeServiceRecordsFromDocuments } from "@/lib/documents/brake-service";
import {
  oilChangeRecordsFromDocuments,
  resolveOilChangeInterval,
} from "@/lib/documents/oil-changes";
import { FEATURE } from "@/lib/permissions/feature-access";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

interface OilIntervalsPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Intervalle · ZeloxTag",
    description: "Öl- und Brems-Intervalle für diesen ZeloxTag.",
  };
}

export default async function VehicleOilIntervalsPage({
  params,
}: OilIntervalsPageProps) {
  const { vehicleId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceWriter({ vehicleId }, {
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "invoice",
      },
    },
  });

  const interval = resolveOilChangeInterval(
    parseVehicleTechSpecs(result.vehicle!.tech_specs),
  );
  const records = oilChangeRecordsFromDocuments(result.documents, interval);
  const brakeRecords = brakeServiceRecordsFromDocuments(result.documents);
  const vehicleModel = `${result.vehicle!.make} ${result.vehicle!.model}`;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: scope.linkedTagUuid ?? vehicleId,
    feature: FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    children: (
      <OilIntervalsView
        vehicleModel={vehicleModel}
        records={records}
        brakeRecords={brakeRecords}
        documents={result.documents}
        backHref={`${vehicleSurfaceHref(scope)}`}
        basePath={`${vehicleSurfaceHref(scope, `intervalle`)}`}
        scanHref={`${vehicleSurfaceHref(scope, `?scan=1`)}`}
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleId={result.vehicle!.id}
        canAddManual
      />
    ),
  });
}
