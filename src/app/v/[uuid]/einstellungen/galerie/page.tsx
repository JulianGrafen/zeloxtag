import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleShowcaseGallerySettings } from "@/components/vehicles/vehicle-showcase-gallery-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { MAX_SHOWCASE_GALLERY_PHOTOS } from "@/lib/documents/showcase-gallery";
import { loadVehicleGallerySettingsPage } from "@/lib/vehicles/load-vehicle-gallery-settings-page";

interface GallerySettingsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Showcase-Galerie · ZeloxTag",
    description: "Fotos für die öffentliche Visitenkarte verwalten.",
  };
}

export default async function VehicleGallerySettingsPage({
  params,
}: GallerySettingsPageProps) {
  const { uuid } = await params;
  const { vehicle, isDemo, galleryPhotos } =
    await loadVehicleGallerySettingsPage(uuid);

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={uuid}
        title="Showcase-Galerie"
        description={`Bis zu ${MAX_SHOWCASE_GALLERY_PHOTOS} Fotos für das öffentliche Profil — Besucher sehen sie in der Visitenkarte.`}
      >
        <VehicleShowcaseGallerySettings
          tagUuid={uuid}
          vehicleId={vehicle.id}
          photos={galleryPhotos}
          canEdit={!isDemo}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
