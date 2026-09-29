import { VehicleSettingsSubmenuGroup } from "@/components/vehicles/vehicle-settings-submenu-group";
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
    <div className="flex flex-col gap-2">
      <p className="px-1 text-[0.78rem] font-medium text-[color:var(--vd-muted)]">
        Verkaufsexposé
      </p>
      <VehicleSettingsSubmenuGroup>
        <VehicleSettingsSubmenuLink
          href={`${base}/link`}
          variant="group"
          title="Online-Link"
          subtitle={isExposeActive ? "Aktiv" : "Inaktiv"}
        />
        <VehicleSettingsSubmenuLink
          href={`${base}/pdf`}
          variant="group"
          title="PDF"
          subtitle="Druckfertig exportieren"
        />
      </VehicleSettingsSubmenuGroup>
    </div>
  );
}
