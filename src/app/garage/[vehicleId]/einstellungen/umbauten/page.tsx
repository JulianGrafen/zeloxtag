import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleShowcaseModificationsSettings } from "@/components/vehicles/vehicle-showcase-modifications-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadVehicleUmbautenSettingsPage } from "@/lib/vehicles/load-vehicle-umbauten-settings-page";

interface UmbautenSettingsPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Chronik & Rechnungen · ZeloxTag",
    description: "Build-Chronik und Rechnungen im öffentlichen Showcase verwalten.",
  };
}

export default async function VehicleUmbautenSettingsPage({
  params,
}: UmbautenSettingsPageProps) {
  const { vehicleId } = await params;
  const { vehicle, documents, isDemo, scope } =
    await loadVehicleUmbautenSettingsPage(vehicleId);
  const tagUuid = scope.linkedTagUuid ?? vehicleId;

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={tagUuid}
        vehicleSurfaceScope={scope}
        title="Chronik & Rechnungen"
      >
        <VehicleShowcaseModificationsSettings
          tagUuid={tagUuid}
          vehicleSurfaceScope={scope}
          vehicle={vehicle}
          documents={documents}
          canEdit={!isDemo}
          hasLinkedTag={Boolean(scope.linkedTagUuid)}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
