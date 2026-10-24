import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleShowcaseModificationsSubmenuProps = {
  surfaceScope: VehicleSurfaceScope;
  modificationCount: number;
  invoiceCount: number;
  visibleCount: number;
  chronikEntryCount?: number;
  isStoryPublic?: boolean;
  variant?: "tile" | "group";
  isLast?: boolean;
};

export function VehicleShowcaseModificationsSubmenu({
  surfaceScope,
  modificationCount,
  invoiceCount,
  visibleCount,
  chronikEntryCount = 0,
  isStoryPublic = false,
  variant = "tile",
  isLast = false,
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

  if (isStoryPublic && chronikEntryCount > 0) {
    subtitle = `${subtitle} · Chronik ${chronikEntryCount}`;
  }

  return (
    <VehicleSettingsSubmenuLink
      href={vehicleSurfaceHref(surfaceScope, "einstellungen/umbauten")}
      variant={variant}
      title="Chronik & Rechnungen"
      subtitle={subtitle}
      isLast={isLast}
    />
  );
}
