import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";

type VehicleShowcaseSoundSubmenuProps = {
  tagUuid: string;
  hasSound: boolean;
  variant?: "tile" | "group";
};

export function VehicleShowcaseSoundSubmenu({
  tagUuid,
  hasSound,
  variant = "tile",
}: VehicleShowcaseSoundSubmenuProps) {
  return (
    <VehicleSettingsSubmenuLink
      href={`/v/${tagUuid}/einstellungen/soundcheck`}
      variant={variant}
      title="Soundcheck"
      subtitle={hasSound ? "Aktiv" : "Nicht hinterlegt"}
    />
  );
}
