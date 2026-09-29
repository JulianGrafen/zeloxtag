import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import { publicProfileStatusSubtitle } from "@/lib/vehicles/public-profile-status";

type VehiclePublicProfileSubmenuProps = {
  surfaceScope: VehicleSurfaceScope;
  isPublic: boolean;
  showcaseSwipeOptIn: boolean;
  hasLinkedTag: boolean;
  variant?: "tile" | "group";
};

export function VehiclePublicProfileSubmenu({
  surfaceScope,
  isPublic,
  showcaseSwipeOptIn,
  hasLinkedTag,
  variant = "tile",
}: VehiclePublicProfileSubmenuProps) {
  return (
    <VehicleSettingsSubmenuLink
      href={vehicleSurfaceHref(surfaceScope, "einstellungen/profil")}
      variant={variant}
      title="Öffentliches Profil"
      subtitle={publicProfileStatusSubtitle({
        isPublic,
        showcaseSwipeOptIn,
        hasLinkedTag,
      })}
    />
  );
}
