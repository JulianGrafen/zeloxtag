import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleShowcaseModificationsSubmenuProps = {
  surfaceScope: VehicleSurfaceScope;
  modificationCount: number;
  invoiceCount: number;
  visibleCount: number;
  variant?: "tile" | "group";
};

export function VehicleShowcaseModificationsSubmenu({
  surfaceScope,
  modificationCount,
  invoiceCount,
  visibleCount,
  variant = "tile",
}: VehicleShowcaseModificationsSubmenuProps) {
  const totalCount = modificationCount + invoiceCount;

  let subtitle: string;
  if (totalCount === 0) {
    subtitle = "Keine Belege";
  } else if (visibleCount > 0) {
    subtitle = `${visibleCount} von ${totalCount} sichtbar`;
  } else {
    subtitle = `${totalCount} Belege · unsichtbar`;
  }

  return (
    <VehicleSettingsSubmenuLink
      href={vehicleSurfaceHref(surfaceScope, "einstellungen/umbauten")}
      variant={variant}
      title="Umbauten & Rechnungen"
      subtitle={subtitle}
    />
  );
}
