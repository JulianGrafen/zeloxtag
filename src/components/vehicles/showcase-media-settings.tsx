"use client";

import { useRouter } from "next/navigation";

import { ShowcasePublicMediaNotice } from "@/components/vehicles/showcase-public-media-notice";
import { VehicleDynoChartUpload } from "@/components/vehicles/vehicle-dyno-chart-upload";
import { resolveOwnerDynoChartViewUrl } from "@/lib/vehicles/dyno-chart-constants";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Vehicle } from "@/types/database";

type ShowcaseMediaSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  canEdit: boolean;
  isPublic: boolean;
};

export function ShowcaseMediaSettings({
  tagUuid,
  vehicle,
  canEdit,
  isPublic,
}: ShowcaseMediaSettingsProps) {
  const router = useRouter();
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);

  function refreshAfterMediaChange() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ShowcasePublicMediaNotice isPublic={isPublic} />

      <VehicleDynoChartUpload
        vehicleId={vehicle.id}
        tagUuid={tagUuid}
        dynoChartUrl={resolveOwnerDynoChartViewUrl(vehicle.id, specs.dynoChartUrl)}
        canEdit={canEdit}
        allowDelete={canEdit}
        onUploaded={() => refreshAfterMediaChange()}
        onDeleted={() => refreshAfterMediaChange()}
      />
    </div>
  );
}
