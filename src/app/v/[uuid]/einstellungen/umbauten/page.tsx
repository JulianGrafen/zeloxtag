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
    title: "Umbauten & Belege · ZeloxTag",
    description: "Umbauten erfassen, Belege auswählen und die Build-Chronik freigeben.",
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
        title="Umbauten & Belege"
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
