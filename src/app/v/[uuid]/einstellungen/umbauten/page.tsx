import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleShowcaseModificationsSettings } from "@/components/vehicles/vehicle-showcase-modifications-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadVehicleUmbautenSettingsPage } from "@/lib/vehicles/load-vehicle-umbauten-settings-page";

interface UmbautenSettingsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Umbauten & Rechnungen · ZeloxTag",
    description: "Sichtbare Umbauten und Rechnungen im öffentlichen Showcase verwalten.",
  };
}

export default async function VehicleUmbautenSettingsPage({
  params,
}: UmbautenSettingsPageProps) {
  const { uuid } = await params;
  const { vehicle, documents, isDemo, scope } =
    await loadVehicleUmbautenSettingsPage(uuid);
  const tagUuid = scope.linkedTagUuid ?? uuid;

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={tagUuid}
        vehicleSurfaceScope={scope}
        title="Umbauten & Rechnungen"
        description="Umbauten, Tuning-Einträge und Rechnungen — wähle, was Besucher im öffentlichen Profil sehen."
      >
        <VehicleShowcaseModificationsSettings
          tagUuid={tagUuid}
          vehicleSurfaceScope={scope}
          vehicleId={vehicle.id}
          documents={documents}
          canEdit={!isDemo}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
