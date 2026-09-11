import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";

type VehiclePublicProfileSubmenuProps = {
  tagUuid: string;
  isPublic: boolean;
  variant?: "tile" | "group";
};

export function VehiclePublicProfileSubmenu({
  tagUuid,
  isPublic,
  variant = "tile",
}: VehiclePublicProfileSubmenuProps) {
  return (
    <VehicleSettingsSubmenuLink
      href={`/v/${tagUuid}/einstellungen/profil`}
      variant={variant}
      title="Öffentliches Profil"
      subtitle={isPublic ? "Öffentlich" : "Privat"}
    />
  );
}
