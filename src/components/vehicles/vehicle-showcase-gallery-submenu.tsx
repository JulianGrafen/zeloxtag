import { MAX_SHOWCASE_GALLERY_PHOTOS } from "@/lib/documents/showcase-gallery";
import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleShowcaseGallerySubmenuProps = {
  surfaceScope: VehicleSurfaceScope;
  photoCount: number;
  variant?: "tile" | "group";
};

export function VehicleShowcaseGallerySubmenu({
  surfaceScope,
  photoCount,
  variant = "tile",
}: VehicleShowcaseGallerySubmenuProps) {
  const hasPhotos = photoCount > 0;

  return (
    <VehicleSettingsSubmenuLink
      href={vehicleSurfaceHref(surfaceScope, "einstellungen/galerie")}
      variant={variant}
      title="Galerie"
      subtitle={
        hasPhotos
          ? `${photoCount}/${MAX_SHOWCASE_GALLERY_PHOTOS} Fotos`
          : `Bis zu ${MAX_SHOWCASE_GALLERY_PHOTOS} Fotos`
      }
    />
  );
}
