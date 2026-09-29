import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleShowcaseDynoSubmenuProps = {
  surfaceScope: VehicleSurfaceScope;
  hasDynoChart: boolean;
  variant?: "tile" | "group";
};

export function VehicleShowcaseDynoSubmenu({
  surfaceScope,
  hasDynoChart,
  variant = "tile",
}: VehicleShowcaseDynoSubmenuProps) {
  return (
    <VehicleSettingsSubmenuLink
      href={vehicleSurfaceHref(surfaceScope, "einstellungen/leistungsdiagramm")}
      variant={variant}
      title="Leistungsdiagramm"
      subtitle={hasDynoChart ? "Hinterlegt" : "Nicht hinterlegt"}
    />
  );
}
