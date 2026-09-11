import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { VehicleSettingsSubmenuSection } from "@/components/vehicles/vehicle-settings-submenu-section";

type VehicleShowcaseSoundSubmenuProps = {
  tagUuid: string;
  hasSound: boolean;
};

export function VehicleShowcaseSoundSubmenu({
  tagUuid,
  hasSound,
}: VehicleShowcaseSoundSubmenuProps) {
  return (
    <VehicleSettingsSubmenuSection>
      <div className="border-b border-[color:var(--vd-border)] py-4">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Engine soundcheck
        </h2>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Kurzer Motor-Sound für die öffentliche Visitenkarte (max. 10 Sekunden,
          MP3, M4A oder WAV, max. 2 MB).
        </p>
      </div>
      <VehicleSettingsSubmenuLink
        flush
        href={`/v/${tagUuid}/einstellungen/soundcheck`}
        title="Motor-Sound verwalten"
        subtitle={
          hasSound
            ? "Aktiv — Vorschau, ersetzen oder entfernen"
            : "Sound hochladen für die öffentliche Visitenkarte"
        }
      />
    </VehicleSettingsSubmenuSection>
  );
}
