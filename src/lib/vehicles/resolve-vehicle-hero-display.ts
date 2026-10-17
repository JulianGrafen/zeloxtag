import {
  DEMO_SHOWCASE_VEHICLE_IMAGE,
  isDemoActiveTag,
} from "@/lib/tags/demo-showcase";
import { resolveVehicleCatalogImage, resolveVehicleImage } from "@/lib/vehicles/vehicle-image";

export type VehicleHeroDisplay = {
  vehicleImage: string | null;
  vehicleImageFallback?: string | null;
  vehicleImagePreviewFallback?: string | null;
  vehicleImageFrameless: boolean;
  vehicleImageAlt: string;
};

export function resolveVehicleHeroDisplay(input: {
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number | null;
    silhouette_image_url?: string | null;
    updated_at?: string | null;
  };
  tagUuid: string;
  vehicleImageOverride?: string | null;
  previewFallbackUrl?: string | null;
  demoMode?: boolean;
}): VehicleHeroDisplay {
  const { vehicle, tagUuid, vehicleImageOverride, previewFallbackUrl } = input;
  const demoShowcase = isDemoActiveTag(tagUuid);
  const vehicleModel = `${vehicle.make} ${vehicle.model}`.trim();
  const cutout = resolveVehicleImage({
    make: vehicle.make,
    model: vehicle.model,
    vehicleId: vehicle.id,
    silhouetteImageUrl: vehicle.silhouette_image_url,
    silhouetteCacheBust: vehicle.updated_at,
  });
  const catalogCutout = resolveVehicleCatalogImage(vehicle.make, vehicle.model);
  const hasOwnerSilhouette = Boolean(
    !demoShowcase &&
      (vehicleImageOverride?.trim() || vehicle.silhouette_image_url?.trim()),
  );

  return {
    vehicleImage: demoShowcase
      ? DEMO_SHOWCASE_VEHICLE_IMAGE
      : vehicleImageOverride?.trim() || cutout?.src || null,
    vehicleImageFallback: hasOwnerSilhouette
      ? undefined
      : input.demoMode
        ? catalogCutout?.src
        : undefined,
    vehicleImagePreviewFallback: demoShowcase
      ? undefined
      : previewFallbackUrl?.trim() || undefined,
    vehicleImageFrameless:
      demoShowcase || (!hasOwnerSilhouette && Boolean(catalogCutout?.src)),
    vehicleImageAlt:
      cutout?.alt ??
      catalogCutout?.alt ??
      vehicle.year != null
        ? `${vehicleModel} (${vehicle.year})`
        : vehicleModel,
  };
}
