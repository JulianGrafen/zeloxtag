import { MAX_SHOWCASE_GALLERY_PHOTOS } from "@/lib/documents/showcase-gallery";
import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";

type VehicleShowcaseGallerySubmenuProps = {
  tagUuid: string;
  photoCount: number;
  variant?: "tile" | "group";
};

export function VehicleShowcaseGallerySubmenu({
  tagUuid,
  photoCount,
  variant = "tile",
}: VehicleShowcaseGallerySubmenuProps) {
  const hasPhotos = photoCount > 0;

  return (
    <VehicleSettingsSubmenuLink
      href={`/v/${tagUuid}/einstellungen/galerie`}
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
