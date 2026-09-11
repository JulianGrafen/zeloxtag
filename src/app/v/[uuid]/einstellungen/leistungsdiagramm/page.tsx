import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleDynoChartSettings } from "@/components/vehicles/vehicle-dyno-chart-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { resolveOwnerDynoChartViewUrl } from "@/lib/vehicles/dyno-chart-constants";
import { loadVehicleDynoSettingsPage } from "@/lib/vehicles/load-vehicle-dyno-settings-page";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

interface DynoSettingsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Leistungsdiagramm · ZeloxTag",
    description: "Dyno- oder Leistungsdiagramm für den öffentlichen Showcase verwalten.",
  };
}

export default async function VehicleDynoSettingsPage({
  params,
}: DynoSettingsPageProps) {
  const { uuid } = await params;
  const { vehicle, isDemo } = await loadVehicleDynoSettingsPage(uuid);
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const dynoChartUrl = resolveOwnerDynoChartViewUrl(
    vehicle.id,
    specs.dynoChartUrl,
  );

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={uuid}
        title="Leistungsdiagramm"
        description="Dyno- oder Leistungsdiagramm als Foto oder PDF — erscheint im Showcase, wenn dein Profil öffentlich ist."
      >
        <VehicleDynoChartSettings
          vehicleId={vehicle.id}
          tagUuid={uuid}
          dynoChartUrl={dynoChartUrl}
          canEdit={!isDemo}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
