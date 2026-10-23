import { IOSGroupedList } from "@/components/ui/ios";
import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleExposeSubmenuProps = {
  surfaceScope: VehicleSurfaceScope;
  isExposeActive: boolean;
};

export function VehicleExposeSubmenu({
  surfaceScope,
  isExposeActive,
}: VehicleExposeSubmenuProps) {
  const base = vehicleSurfaceHref(surfaceScope, "einstellungen/expose");

  return (
    <IOSGroupedList headerTitle="Verkaufsexposé">
      <VehicleSettingsSubmenuLink
        href={`${base}/link`}
        title="Online-Link"
        subtitle={isExposeActive ? "Aktiv" : "Inaktiv"}
      />
      <VehicleSettingsSubmenuLink
        href={`${base}/pdf`}
        title="PDF"
        subtitle="Druckfertig exportieren"
        isLast
      />
    </IOSGroupedList>
  );
}
