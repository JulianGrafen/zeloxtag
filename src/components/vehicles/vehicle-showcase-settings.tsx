import { IOSGroupedList } from "@/components/ui/ios";
import { ShowcaseMediaSettings } from "@/components/vehicles/showcase-media-settings";
import { ShowcaseWeeklyPlacement } from "@/components/showcase-swipe/showcase-weekly-placement";
import { VehiclePublicProfileSubmenu } from "@/components/vehicles/vehicle-public-profile-submenu";
import { VehicleShowcaseModificationsSubmenu } from "@/components/vehicles/vehicle-showcase-modifications-submenu";
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
  const isPublic = Boolean(vehicle.is_public);
  const profilHref = vehicleSurfaceHref(surfaceScope, "einstellungen/profil");

  return (
    <div className="flex flex-col gap-5">
      <IOSGroupedList headerTitle="Profil">
        <VehiclePublicProfileSubmenu
          surfaceScope={surfaceScope}
          isPublic={isPublic}
          showcaseSwipeOptIn={Boolean(vehicle.showcase_swipe_opt_in)}
          hasLinkedTag={hasLinkedTag}
          isLast
        />
      </IOSGroupedList>

      <IOSGroupedList headerTitle="Medien">
        <ShowcaseMediaSettings
          surfaceScope={surfaceScope}
          vehicle={vehicle}
          galleryPhotos={galleryPhotos}
          canEdit={canEdit}
        />
      </IOSGroupedList>

      {isPublic ? (
        <IOSGroupedList headerTitle="Inhalte">
          <VehicleShowcaseModificationsSubmenu
            surfaceScope={surfaceScope}
            modificationCount={modifications.length}
            invoiceCount={invoices.length}
            visibleCount={visibleShowcaseDocCount}
            isLast
          />
        </IOSGroupedList>
      ) : null}

      {isPublic ? (
        <>
          <IOSGroupedList
            headerTitle="Wochenplatzierung"
            footerText={
              isPublic && vehicle.showcase_swipe_opt_in
                ? "Likes aus „Builds entdecken“ zählen für die letzten 7 Tage."
                : "Aktiviere Build-Swipe unter Öffentliches Profil."
            }
          >
            <ShowcaseWeeklyPlacement
              isPublic={isPublic}
              showcaseSwipeOptIn={Boolean(vehicle.showcase_swipe_opt_in)}
              profilSettingsHref={profilHref}
              weeklyRank={weeklyRank ?? null}
              variant="inset"
            />
          </IOSGroupedList>

          <IOSGroupedList headerTitle="Story-Pass">
            <VehicleShowcaseStoryPassSettings
              vehicle={vehicle}
              documents={documents}
              weeklyRank={weeklyRank}
              embeddedInGroup
            />
          </IOSGroupedList>
        </>
      ) : null}
    </div>
  );
}
