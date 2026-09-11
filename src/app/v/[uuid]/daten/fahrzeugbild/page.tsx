import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleFahrzeugbildSettings } from "@/components/vehicles/vehicle-fahrzeugbild-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { requireTagOwner } from "@/lib/auth/require-tag-access";

interface FahrzeugbildPageProps {
  params: Promise<{ uuid: string }>;
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
  const { uuid } = await params;
  const { result, access, isDemoShowcase } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/daten/fahrzeugbild`,
  });
  const vehicle = result.vehicle;
  if (!vehicle) {
    return null;
  }

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={uuid}
        backHref={`/v/${uuid}/daten`}
        backLabel="Technische Daten"
        title="Fahrzeugbild"
        description="Dashboard und öffentlicher Showcase."
      >
        <VehicleFahrzeugbildSettings
          tagUuid={uuid}
          vehicle={vehicle}
          canEdit={access.isOwner && !isDemoShowcase}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
