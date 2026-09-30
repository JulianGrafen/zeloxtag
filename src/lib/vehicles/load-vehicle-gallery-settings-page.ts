import "server-only";

import { loadShowcaseGalleryDocuments } from "@/lib/documents/load-showcase-gallery";
import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";

export async function loadVehicleGallerySettingsPage(identifier: string) {
  const { vehicle, isDemo } = await requireVehicleSettingsOwner(identifier, {
    loginSuffix: "einstellungen/galerie",
  });
  const galleryPhotos = await loadShowcaseGalleryDocuments(vehicle.id);

  return { vehicle, isDemo, galleryPhotos };
}
