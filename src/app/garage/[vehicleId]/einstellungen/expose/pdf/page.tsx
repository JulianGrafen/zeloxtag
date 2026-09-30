import type { Metadata } from "next";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";

import { AppShell } from "@/components/layout/app-shell";
import { ExposePdfSettings } from "@/components/vehicles/ExposePdfSettings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadVehicleExposeSettingsPage } from "@/lib/vehicles/load-vehicle-expose-settings-page";

interface ExposePdfPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "PDF-Exposé · ZeloxTag",
    description: "Druckfertiges Verkaufs-Exposé als PDF herunterladen.",
  };
}

export default async function VehicleExposePdfPage({
  params,
}: ExposePdfPageProps) {
  const { vehicleId } = await params;
  const { scope } = await requireVehicleSurfaceOwner({ vehicleId });
  const { vehicle, isDemo, canUseExpose } =
    await loadVehicleExposeSettingsPage(vehicleId);
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleSurfaceScope={scope}
        title="PDF-Exposé"
        description={`Druckfertiges Verkaufs-Exposé für ${vehicleLabel} — inkl. Historie, Umbauten und QR-Link zum ZeloxTag-Profil.`}
      >
        <ExposePdfSettings
          tagUuid={scope.linkedTagUuid ?? vehicleId}
          vehicle={vehicle}
          canEdit={!isDemo}
          canUseExpose={canUseExpose}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
