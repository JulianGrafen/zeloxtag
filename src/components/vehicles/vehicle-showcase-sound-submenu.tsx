import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleShowcaseSoundSubmenuProps = {
  surfaceScope: VehicleSurfaceScope;
  hasSound: boolean;
  variant?: "tile" | "group";
  isLast?: boolean;
};

export function VehicleShowcaseSoundSubmenu({
  surfaceScope,
  hasSound,
  variant = "tile",
  isLast = false,
}: VehicleShowcaseSoundSubmenuProps) {
  return (
    <VehicleSettingsSubmenuLink
      href={vehicleSurfaceHref(surfaceScope, "einstellungen/soundcheck")}
      variant={variant}
      title="Soundcheck"
      subtitle={hasSound ? "Aktiv" : "Nicht hinterlegt"}
      isLast={isLast}
    />
  );
}
