import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { VehicleSettingsSubmenuSection } from "@/components/vehicles/vehicle-settings-submenu-section";

type VehicleExposeSubmenuProps = {
  tagUuid: string;
  isExposeActive: boolean;
  vehicleLabel: string;
};

export function VehicleExposeSubmenu({
  tagUuid,
  isExposeActive,
  vehicleLabel,
}: VehicleExposeSubmenuProps) {
  const base = `/v/${tagUuid}/einstellungen/expose`;

  return (
    <VehicleSettingsSubmenuSection className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-0 shadow-[var(--vd-shadow-sm)]">
      <div className="border-b border-[color:var(--vd-border)] px-4 py-4 sm:px-5">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          1-Klick Verkaufsexposé
        </h2>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Fälschungssicheres Dossier mit Investitionen und Historie — ohne
          Adressen, IBAN oder private Notizen.
        </p>
      </div>
      <div className="divide-y divide-[color:var(--vd-border)]">
        <VehicleSettingsSubmenuLink
          href={`${base}/link`}
          title="Online-Verkaufsexposé"
          subtitle={
            isExposeActive
              ? "Aktiv — Link teilen, neu erzeugen oder deaktivieren"
              : "Link für Mobile.de und Kleinanzeigen aktivieren"
          }
        />
        <VehicleSettingsSubmenuLink
          href={`${base}/pdf`}
          title="PDF-Exposé"
          subtitle={`Druckfertiges Verkaufs-Exposé für ${vehicleLabel}`}
        />
      </div>
    </VehicleSettingsSubmenuSection>
  );
}
