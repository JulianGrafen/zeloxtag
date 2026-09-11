import { ShowcaseMediaSettings } from "@/components/vehicles/showcase-media-settings";
import { VehiclePublicProfileSubmenu } from "@/components/vehicles/vehicle-public-profile-submenu";
import { VehicleSettingsSubmenuGroup } from "@/components/vehicles/vehicle-settings-submenu-group";
import { VehicleShowcaseModificationsSubmenu } from "@/components/vehicles/vehicle-showcase-modifications-submenu";
import { partitionShowcaseSelectableDocuments } from "@/lib/vehicles/public-showcase-documents";
import type { Document, Vehicle } from "@/types/database";

type VehicleShowcaseSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  documents: Document[];
  galleryPhotos: Document[];
  canEdit: boolean;
};

export function VehicleShowcaseSettings({
  tagUuid,
  vehicle,
  documents,
  galleryPhotos,
  canEdit,
}: VehicleShowcaseSettingsProps) {
  const { invoices, modifications } =
    partitionShowcaseSelectableDocuments(documents);
  const visibleShowcaseDocCount = [...modifications, ...invoices].filter(
    (doc) => doc.show_on_public_showcase,
  ).length;

  return (
    <VehicleSettingsSubmenuGroup>
      <VehiclePublicProfileSubmenu
        tagUuid={tagUuid}
        isPublic={Boolean(vehicle.is_public)}
        variant="group"
      />

      <ShowcaseMediaSettings
        tagUuid={tagUuid}
        vehicle={vehicle}
        galleryPhotos={galleryPhotos}
        canEdit={canEdit}
        variant="group"
      />

      {vehicle.is_public ? (
        <VehicleShowcaseModificationsSubmenu
          tagUuid={tagUuid}
          modificationCount={modifications.length}
          invoiceCount={invoices.length}
          visibleCount={visibleShowcaseDocCount}
          variant="group"
        />
      ) : null}
    </VehicleSettingsSubmenuGroup>
  );
}
