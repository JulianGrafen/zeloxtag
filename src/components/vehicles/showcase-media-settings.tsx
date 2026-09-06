"use client";

import { useRouter } from "next/navigation";

import { VehicleSilhouetteUpload } from "@/components/onboarding/VehicleSilhouetteUpload";
import type { SilhouetteUploadResult } from "@/components/onboarding/VehicleSilhouetteUpload";
import { ShowcasePublicMediaNotice } from "@/components/vehicles/showcase-public-media-notice";
import { VehicleDynoChartUpload } from "@/components/vehicles/vehicle-dyno-chart-upload";
import {
  clearSilhouetteFromSession,
  writeSilhouetteToSession,
} from "@/lib/vehicles/silhouette-session";
import { silhouetteDisplayUrl } from "@/lib/vehicles/silhouette-display-url";
import { resolveOwnerDynoChartViewUrl } from "@/lib/vehicles/dyno-chart-constants";
import {
  parseVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
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
  const silhouettePreviewUrl = vehicle.silhouette_image_url?.trim()
    ? silhouetteDisplayUrl(vehicle.id)
    : null;

  function refreshAfterMediaChange() {
    router.refresh();
  }

  function handleDynoUploaded(url: string) {
    void url;
    refreshAfterMediaChange();
  }

  function handleDynoDeleted() {
    refreshAfterMediaChange();
  }

  return (
    <div className="space-y-4">
      <ShowcasePublicMediaNotice isPublic={isPublic} />

      {canEdit ? (
        <VehicleSilhouetteUpload
          vehicleId={vehicle.id}
          tagUuid={tagUuid}
          initialDisplayUrl={silhouettePreviewUrl}
          allowDelete
          title="Showcase-Foto"
          description="Hero-Bild für deinen öffentlichen Showcase — sichtbar für alle Besucher."
          onUploaded={(result: SilhouetteUploadResult) => {
            writeSilhouetteToSession(vehicle.id, result.storageUrl);
            refreshAfterMediaChange();
          }}
          onDeleted={() => {
            clearSilhouetteFromSession(vehicle.id);
            refreshAfterMediaChange();
          }}
        />
      ) : null}

      <VehicleDynoChartUpload
        vehicleId={vehicle.id}
        tagUuid={tagUuid}
        dynoChartUrl={resolveOwnerDynoChartViewUrl(vehicle.id, specs.dynoChartUrl)}
        canEdit={canEdit}
        allowDelete={canEdit}
        onUploaded={handleDynoUploaded}
        onDeleted={handleDynoDeleted}
      />
    </div>
  );
}
