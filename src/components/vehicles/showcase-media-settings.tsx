import { VehicleShowcaseDynoSubmenu } from "@/components/vehicles/vehicle-showcase-dyno-submenu";
import { VehicleShowcaseGallerySubmenu } from "@/components/vehicles/vehicle-showcase-gallery-submenu";
import { VehicleShowcaseSoundSubmenu } from "@/components/vehicles/vehicle-showcase-sound-submenu";
import { filterShowcaseGalleryDocuments } from "@/lib/documents/showcase-gallery";
import { resolveOwnerDynoChartViewUrl } from "@/lib/vehicles/dyno-chart-constants";
import { resolveOwnerEngineSoundViewUrl } from "@/lib/vehicles/engine-sound-constants";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { Document, Vehicle } from "@/types/database";

type ShowcaseMediaSettingsProps = {
  surfaceScope: VehicleSurfaceScope;
  vehicle: Vehicle;
  galleryPhotos: Document[];
  canEdit: boolean;
  variant?: "tile" | "group";
};

export function ShowcaseMediaSettings({
  surfaceScope,
  vehicle,
  galleryPhotos,
  variant = "tile",
}: ShowcaseMediaSettingsProps) {
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);

  return (
    <>
      <VehicleShowcaseGallerySubmenu
        surfaceScope={surfaceScope}
        photoCount={filterShowcaseGalleryDocuments(galleryPhotos).length}
        variant={variant}
      />

      <VehicleShowcaseDynoSubmenu
        surfaceScope={surfaceScope}
        hasDynoChart={Boolean(
          resolveOwnerDynoChartViewUrl(vehicle.id, specs.dynoChartUrl),
        )}
        variant={variant}
      />

      <VehicleShowcaseSoundSubmenu
        surfaceScope={surfaceScope}
        hasSound={Boolean(
          resolveOwnerEngineSoundViewUrl(vehicle.id, vehicle.sound_url),
        )}
        variant={variant}
      />
    </>
  );
}
