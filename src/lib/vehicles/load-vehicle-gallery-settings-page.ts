import "server-only";

import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { loadShowcaseGalleryDocuments } from "@/lib/documents/load-showcase-gallery";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";

export async function loadVehicleGallerySettingsPage(tagUuid: string) {
  const { result, isDemoShowcase } = await requireTagOwner(tagUuid, {
    loginNext: `/v/${tagUuid}/einstellungen/galerie`,
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(tagUuid);
  const galleryPhotos = await loadShowcaseGalleryDocuments(vehicle.id);

  return { vehicle, isDemo, galleryPhotos };
}
