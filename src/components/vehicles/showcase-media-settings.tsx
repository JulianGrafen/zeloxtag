"use client";

import { useRouter } from "next/navigation";

import { ShowcaseGallerySettings } from "@/components/vehicles/showcase-gallery-settings";
import { ShowcasePublicMediaNotice } from "@/components/vehicles/showcase-public-media-notice";
import { VehicleDynoChartUpload } from "@/components/vehicles/vehicle-dyno-chart-upload";
import { resolveOwnerDynoChartViewUrl } from "@/lib/vehicles/dyno-chart-constants";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Vehicle } from "@/types/database";

type ShowcaseMediaSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  galleryPhotos: Document[];
  canEdit: boolean;
  isPublic: boolean;
};

export function ShowcaseMediaSettings({
  tagUuid,
  vehicle,
  galleryPhotos,
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

      <ShowcaseGallerySettings
        tagUuid={tagUuid}
        vehicleId={vehicle.id}
        photos={galleryPhotos}
        canEdit={canEdit}
        onChanged={refreshAfterMediaChange}
      />

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
