import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { VehiclePublicProfileSettings } from "@/components/vehicles/vehicle-public-profile-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadVehiclePublicProfileSettingsPage } from "@/lib/vehicles/load-vehicle-public-profile-settings-page";

interface PublicProfileSettingsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Öffentliches Profil · ZeloxTag",
    description: "Showcase-Seite, Preise und Share-Link verwalten.",
  };
}

export default async function VehiclePublicProfileSettingsPage({
  params,
}: PublicProfileSettingsPageProps) {
  const { uuid } = await params;
  const {
    vehicle,
    isDemo,
    showcaseSwipeTotalLikes,
    showcaseSwipeUnreadLikes,
  } = await loadVehiclePublicProfileSettingsPage(uuid);

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={uuid}
        title="Öffentliches Profil"
        description="Showcase-Seite mit Share-Link — sichtbar für Besucher, wenn das Profil öffentlich ist."
      >
        <VehiclePublicProfileSettings
          tagUuid={uuid}
          vehicleId={vehicle.id}
          isPublic={Boolean(vehicle.is_public)}
          hideFinancials={vehicle.hide_financials !== false}
          showcaseSwipeOptIn={Boolean(vehicle.showcase_swipe_opt_in)}
          publicSlug={vehicle.public_slug}
          canEdit={!isDemo}
          showcaseSwipeTotalLikes={showcaseSwipeTotalLikes}
          showcaseSwipeUnreadLikes={showcaseSwipeUnreadLikes}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
