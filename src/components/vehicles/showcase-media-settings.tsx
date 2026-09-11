import { VehicleShowcaseDynoSubmenu } from "@/components/vehicles/vehicle-showcase-dyno-submenu";
import { VehicleShowcaseGallerySubmenu } from "@/components/vehicles/vehicle-showcase-gallery-submenu";
import { VehicleShowcaseSoundSubmenu } from "@/components/vehicles/vehicle-showcase-sound-submenu";
import { filterShowcaseGalleryDocuments } from "@/lib/documents/showcase-gallery";
import { resolveOwnerDynoChartViewUrl } from "@/lib/vehicles/dyno-chart-constants";
import { resolveOwnerEngineSoundViewUrl } from "@/lib/vehicles/engine-sound-constants";
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
}: ShowcaseMediaSettingsProps) {
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);

  return (
    <div className="divide-y divide-[color:var(--vd-border)]">
      <VehicleShowcaseGallerySubmenu
        tagUuid={tagUuid}
        photoCount={filterShowcaseGalleryDocuments(galleryPhotos).length}
      />

      <VehicleShowcaseDynoSubmenu
        tagUuid={tagUuid}
        hasDynoChart={Boolean(
          resolveOwnerDynoChartViewUrl(vehicle.id, specs.dynoChartUrl),
        )}
      />

      <VehicleShowcaseSoundSubmenu
        tagUuid={tagUuid}
        hasSound={Boolean(
          resolveOwnerEngineSoundViewUrl(vehicle.id, vehicle.sound_url),
        )}
      />
    </div>
  );
}
