import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleFahrzeugbildSettings } from "@/components/vehicles/vehicle-fahrzeugbild-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";

interface FahrzeugbildPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Fahrzeugbild · ZeloxTag",
    description: "Profilbild für Dashboard und Showcase.",
  };
}

export default async function VehicleFahrzeugbildPage({
  params,
}: FahrzeugbildPageProps) {
  const { vehicleId } = await params;
  const { scope, result, access, isDemoShowcase } = await requireVehicleSurfaceOwner({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/daten/fahrzeugbild/daten/fahrzeugbild`,
  });
  const vehicle = result.vehicle;
  if (!vehicle) {
    return null;
  }

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        backHref={`${vehicleSurfaceHref(scope, `daten`)}`}
        backLabel="Technische Daten"
        title="Fahrzeugbild"
        description="Dashboard und öffentlicher Showcase."
      >
        <VehicleFahrzeugbildSettings
          tagUuid={scope.linkedTagUuid ?? vehicleId}
          vehicle={vehicle}
          canEdit={access.isOwner && !isDemoShowcase}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
