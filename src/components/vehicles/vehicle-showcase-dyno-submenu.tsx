import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";

type VehicleShowcaseDynoSubmenuProps = {
  tagUuid: string;
  hasDynoChart: boolean;
  variant?: "tile" | "group";
};

export function VehicleShowcaseDynoSubmenu({
  tagUuid,
  hasDynoChart,
  variant = "tile",
}: VehicleShowcaseDynoSubmenuProps) {
  return (
    <VehicleSettingsSubmenuLink
      href={`/v/${tagUuid}/einstellungen/leistungsdiagramm`}
      variant={variant}
      title="Leistungsdiagramm"
      subtitle={hasDynoChart ? "Hinterlegt" : "Nicht hinterlegt"}
    />
  );
}
