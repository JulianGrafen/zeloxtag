import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleSoundcheckSettings } from "@/components/vehicles/vehicle-soundcheck-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { resolveOwnerEngineSoundViewUrl } from "@/lib/vehicles/engine-sound-constants";
import { loadVehicleSoundcheckSettingsPage } from "@/lib/vehicles/load-vehicle-soundcheck-settings-page";

interface SoundcheckSettingsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Engine soundcheck · ZeloxTag",
    description: "Motor-Sound für die öffentliche Visitenkarte verwalten.",
  };
}

export default async function VehicleSoundcheckSettingsPage({
  params,
}: SoundcheckSettingsPageProps) {
  const { uuid } = await params;
  const { vehicle, isDemo } = await loadVehicleSoundcheckSettingsPage(uuid);
  const soundUrl = resolveOwnerEngineSoundViewUrl(
    vehicle.id,
    vehicle.sound_url,
  );

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={uuid}
        title="Engine soundcheck"
        description="Kurzer Motor-Sound für die öffentliche Visitenkarte (max. 10 Sekunden, MP3, M4A oder WAV, max. 2 MB)."
      >
        <VehicleSoundcheckSettings
          vehicleId={vehicle.id}
          tagUuid={uuid}
          soundUrl={soundUrl}
          canEdit={!isDemo}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
