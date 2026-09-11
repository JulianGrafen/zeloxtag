import { MAX_SHOWCASE_GALLERY_PHOTOS } from "@/lib/documents/showcase-gallery";
import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { VehicleSettingsSubmenuSection } from "@/components/vehicles/vehicle-settings-submenu-section";

type VehicleShowcaseGallerySubmenuProps = {
  tagUuid: string;
  photoCount: number;
};

export function VehicleShowcaseGallerySubmenu({
  tagUuid,
  photoCount,
}: VehicleShowcaseGallerySubmenuProps) {
  const hasPhotos = photoCount > 0;

  return (
    <VehicleSettingsSubmenuSection>
      <div className="border-b border-[color:var(--vd-border)] py-4">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Showcase-Galerie
        </h2>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Fotos für das öffentliche Profil — Besucher sehen sie in der
          Visitenkarte.
        </p>
      </div>
      <VehicleSettingsSubmenuLink
        flush
        href={`/v/${tagUuid}/einstellungen/galerie`}
        title="Galerie verwalten"
        subtitle={
          hasPhotos
            ? `${photoCount}/${MAX_SHOWCASE_GALLERY_PHOTOS} Fotos — hinzufügen oder entfernen`
            : `Noch keine Fotos — bis zu ${MAX_SHOWCASE_GALLERY_PHOTOS} hochladen`
        }
      />
    </VehicleSettingsSubmenuSection>
  );
}
