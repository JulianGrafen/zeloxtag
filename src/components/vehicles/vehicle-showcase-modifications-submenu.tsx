import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { VehicleSettingsSubmenuSection } from "@/components/vehicles/vehicle-settings-submenu-section";

type VehicleShowcaseModificationsSubmenuProps = {
  tagUuid: string;
  modificationCount: number;
  invoiceCount: number;
  visibleCount: number;
};

export function VehicleShowcaseModificationsSubmenu({
  tagUuid,
  modificationCount,
  invoiceCount,
  visibleCount,
}: VehicleShowcaseModificationsSubmenuProps) {
  const totalCount = modificationCount + invoiceCount;

  return (
    <VehicleSettingsSubmenuSection>
      <div className="border-b border-[color:var(--vd-border)] py-4">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Umbauten & Rechnungen
        </h2>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Umbauten, Tuning-Einträge und Rechnungen — wähle, was Besucher im
          öffentlichen Profil sehen.
        </p>
      </div>
      <VehicleSettingsSubmenuLink
        flush
        href={`/v/${tagUuid}/einstellungen/umbauten`}
        title="Belege verwalten"
        subtitle={
          totalCount === 0
            ? "Noch keine Umbauten oder Rechnungen in deinen Belegen"
            : visibleCount > 0
              ? `${totalCount} Belege · ${visibleCount} im Showcase sichtbar`
              : `${totalCount} Belege — Sichtbarkeit festlegen`
        }
      />
    </VehicleSettingsSubmenuSection>
  );
}
