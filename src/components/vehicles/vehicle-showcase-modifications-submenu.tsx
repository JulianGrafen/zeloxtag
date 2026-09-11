import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";

type VehicleShowcaseModificationsSubmenuProps = {
  tagUuid: string;
  modificationCount: number;
  invoiceCount: number;
  visibleCount: number;
  variant?: "tile" | "group";
};

export function VehicleShowcaseModificationsSubmenu({
  tagUuid,
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
      href={`/v/${tagUuid}/einstellungen/umbauten`}
      variant={variant}
      title="Umbauten & Rechnungen"
      subtitle={subtitle}
    />
  );
}
