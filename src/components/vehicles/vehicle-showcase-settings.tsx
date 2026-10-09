import { ShowcaseMediaSettings } from "@/components/vehicles/showcase-media-settings";
import { VehiclePublicProfileSubmenu } from "@/components/vehicles/vehicle-public-profile-submenu";
import { VehicleSettingsSubmenuGroup } from "@/components/vehicles/vehicle-settings-submenu-group";
import { VehicleShowcaseModificationsSubmenu } from "@/components/vehicles/vehicle-showcase-modifications-submenu";
import { ShowcaseWeeklyPlacement } from "@/components/showcase-swipe/showcase-weekly-placement";
import { VehicleShowcaseStoryPassSettings } from "@/components/vehicles/vehicle-showcase-story-pass-settings";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
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
  weeklyRank?: VehicleWeeklyShowcaseRank | null;
};

export function VehicleShowcaseSettings({
  surfaceScope,
  vehicle,
  documents,
  galleryPhotos,
  canEdit,
  hasLinkedTag,
  weeklyRank = null,
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
        <>
          <ShowcaseWeeklyPlacement
            isPublic={Boolean(vehicle.is_public)}
            showcaseSwipeOptIn={Boolean(vehicle.showcase_swipe_opt_in)}
            profilSettingsHref={vehicleSurfaceHref(
              surfaceScope,
              "einstellungen/profil",
            )}
            weeklyRank={weeklyRank}
            variant="section"
          />
          <VehicleShowcaseStoryPassSettings
            vehicle={vehicle}
            documents={documents}
            weeklyRank={weeklyRank}
          />
        </>
      ) : null}
    </VehicleSettingsSubmenuGroup>
  );
}
