import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { VehicleSettingsSubmenuSection } from "@/components/vehicles/vehicle-settings-submenu-section";

type VehicleShowcaseDynoSubmenuProps = {
  tagUuid: string;
  hasDynoChart: boolean;
};

export function VehicleShowcaseDynoSubmenu({
  tagUuid,
  hasDynoChart,
}: VehicleShowcaseDynoSubmenuProps) {
  return (
    <VehicleSettingsSubmenuSection>
      <div className="border-b border-[color:var(--vd-border)] py-4">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Leistungsdiagramm
        </h2>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Dyno- oder Leistungsdiagramm als Foto oder PDF — sichtbar im Showcase,
          wenn dein Profil öffentlich ist.
        </p>
      </div>
      <VehicleSettingsSubmenuLink
        flush
        href={`/v/${tagUuid}/einstellungen/leistungsdiagramm`}
        title="Leistungsdiagramm verwalten"
        subtitle={
          hasDynoChart
            ? "Hinterlegt — ansehen, ersetzen oder löschen"
            : "Foto oder PDF für die öffentliche Visitenkarte hochladen"
        }
      />
    </VehicleSettingsSubmenuSection>
  );
}
