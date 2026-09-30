import type { Metadata } from "next";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleShowcaseModificationsSettings } from "@/components/vehicles/vehicle-showcase-modifications-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadVehicleUmbautenSettingsPage } from "@/lib/vehicles/load-vehicle-umbauten-settings-page";

interface UmbautenSettingsPageProps {
  params: Promise<{ vehicleId: string }>;
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
  const { vehicleId } = await params;
  const { scope } = await requireVehicleSurfaceOwner({ vehicleId });
  const { vehicle, documents, isDemo } =
    await loadVehicleUmbautenSettingsPage(scope.linkedTagUuid ?? vehicleId);

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleSurfaceScope={scope}
        title="Umbauten & Rechnungen"
        description="Umbauten, Tuning-Einträge und Rechnungen — wähle, was Besucher im öffentlichen Profil sehen."
      >
        <VehicleShowcaseModificationsSettings
          tagUuid={scope.linkedTagUuid ?? vehicleId}
          vehicleSurfaceScope={scope}
          vehicleId={vehicle.id}
          documents={documents}
          canEdit={!isDemo}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
