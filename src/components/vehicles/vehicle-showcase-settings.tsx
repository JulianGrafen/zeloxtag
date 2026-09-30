import { ShowcaseMediaSettings } from "@/components/vehicles/showcase-media-settings";
import { VehiclePublicProfileSubmenu } from "@/components/vehicles/vehicle-public-profile-submenu";
import { VehicleSettingsSubmenuGroup } from "@/components/vehicles/vehicle-settings-submenu-group";
import { VehicleShowcaseModificationsSubmenu } from "@/components/vehicles/vehicle-showcase-modifications-submenu";
import { VehicleShowcaseStoryPassSettings } from "@/components/vehicles/vehicle-showcase-story-pass-settings";
import { partitionShowcaseSelectableDocuments } from "@/lib/vehicles/public-showcase-documents";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { Document, Vehicle } from "@/types/database";

type VehicleShowcaseSettingsProps = {
  surfaceScope: VehicleSurfaceScope;
  vehicle: Vehicle;
  documents: Document[];
  galleryPhotos: Document[];
  canEdit: boolean;
  hasLinkedTag: boolean;
  linkedTagUuid: string | null;
};

export function VehicleShowcaseSettings({
  surfaceScope,
  vehicle,
  documents,
  galleryPhotos,
  canEdit,
  hasLinkedTag,
}: VehicleShowcaseSettingsProps) {
  const { invoices, modifications } =
    partitionShowcaseSelectableDocuments(documents);
  const visibleShowcaseDocCount = [...modifications, ...invoices].filter(
    (doc) => doc.show_on_public_showcase,
  ).length;

  return (
    <VehicleSettingsSubmenuGroup>
      <VehiclePublicProfileSubmenu
        surfaceScope={surfaceScope}
        isPublic={Boolean(vehicle.is_public)}
        showcaseSwipeOptIn={Boolean(vehicle.showcase_swipe_opt_in)}
        hasLinkedTag={hasLinkedTag}
        variant="group"
      />

      <ShowcaseMediaSettings
        surfaceScope={surfaceScope}
        vehicle={vehicle}
        galleryPhotos={galleryPhotos}
        canEdit={canEdit}
        variant="group"
      />

      {vehicle.is_public ? (
        <VehicleShowcaseModificationsSubmenu
          surfaceScope={surfaceScope}
          modificationCount={modifications.length}
          invoiceCount={invoices.length}
          visibleCount={visibleShowcaseDocCount}
          variant="group"
        />
      ) : null}

      {vehicle.is_public ? (
        <VehicleShowcaseStoryPassSettings
          vehicle={vehicle}
          documents={documents}
        />
      ) : null}
    </VehicleSettingsSubmenuGroup>
  );
}
