import type { Metadata } from "next";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";

import { AppShell } from "@/components/layout/app-shell";
import { ExposeLinkSettings } from "@/components/vehicles/ExposeLinkSettings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadVehicleExposeSettingsPage } from "@/lib/vehicles/load-vehicle-expose-settings-page";
import { scopeFromGarageRoute } from "@/lib/vehicle-surface/paths";

interface ExposeLinkPageProps {
  params: Promise<{ vehicleId: string }>;
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
  const { vehicleId } = await params;
  const garageNavScope = scopeFromGarageRoute(vehicleId);
  const { scope } = await requireVehicleSurfaceOwner({ vehicleId });
  const { vehicle, isDemo, canUseExpose, exposeToken, isExposeActive } =
    await loadVehicleExposeSettingsPage(vehicleId);

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleSurfaceScope={garageNavScope}
        title="Online-Verkaufsexposé"
        description="Erzeugt ein fälschungssicheres Dossier mit Investitionen, Services und Historie — ideal für Mobile.de und Kleinanzeigen. Adressen, IBAN und private Notizen bleiben draußen."
      >
        <ExposeLinkSettings
          tagUuid={scope.linkedTagUuid ?? vehicleId}
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
