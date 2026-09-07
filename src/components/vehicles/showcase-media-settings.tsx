"use client";

import { useRouter } from "next/navigation";

import { ShowcaseGallerySettings } from "@/components/vehicles/showcase-gallery-settings";
import { VehicleDynoChartUpload } from "@/components/vehicles/vehicle-dyno-chart-upload";
import { resolveOwnerDynoChartViewUrl } from "@/lib/vehicles/dyno-chart-constants";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Vehicle } from "@/types/database";

type ShowcaseMediaSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  galleryPhotos: Document[];
  canEdit: boolean;
};

export function ShowcaseMediaSettings({
  tagUuid,
  vehicle,
  galleryPhotos,
  canEdit,
}: ShowcaseMediaSettingsProps) {
  const router = useRouter();
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);

  function refreshAfterMediaChange() {
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <ShowcaseGallerySettings
        tagUuid={tagUuid}
        vehicleId={vehicle.id}
        photos={galleryPhotos}
        canEdit={canEdit}
        onChanged={refreshAfterMediaChange}
      />

      <VehicleDynoChartUpload
        embedded
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
