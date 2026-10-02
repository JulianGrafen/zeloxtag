import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ExposeLinkSettings } from "@/components/vehicles/ExposeLinkSettings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadVehicleExposeSettingsPage } from "@/lib/vehicles/load-vehicle-expose-settings-page";

interface ExposeLinkPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Online-Verkaufsexposé · ZeloxTag",
    description: "Öffentlichen Exposé-Link für Verkäufer aktivieren und teilen.",
  };
}

export default async function VehicleExposeLinkPage({
  params,
}: ExposeLinkPageProps) {
  const { uuid } = await params;
  const { vehicle, isDemo, canUseExpose, exposeToken, isExposeActive, scope } =
    await loadVehicleExposeSettingsPage(uuid, "einstellungen/expose/link");
  const tagUuid = scope.linkedTagUuid ?? uuid;

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={tagUuid}
        vehicleSurfaceScope={scope}
        title="Online-Verkaufsexposé"
        description="Erzeugt ein fälschungssicheres Dossier mit Investitionen, Services und Historie — ideal für Mobile.de und Kleinanzeigen. Adressen, IBAN und private Notizen bleiben draußen."
      >
        <ExposeLinkSettings
          tagUuid={tagUuid}
          vehicle={vehicle}
          canEdit={!isDemo}
          canUseExpose={canUseExpose}
          exposeToken={exposeToken}
          isExposeActive={isExposeActive}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
