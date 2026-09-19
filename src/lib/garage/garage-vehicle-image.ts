import { resolveVehicleImage } from "@/lib/vehicles/vehicle-image";

/** Resolve dashboard-style cutout URL for garage list rows. */
export function garageVehicleImageSrc(input: {
  vehicleId: string;
  make: string;
  model: string;
  silhouetteImageUrl?: string | null;
  silhouetteCacheBust?: string | null;
}): string | undefined {
  return resolveVehicleImage({
    vehicleId: input.vehicleId,
    make: input.make,
    model: input.model,
    silhouetteImageUrl: input.silhouetteImageUrl,
    silhouetteCacheBust: input.silhouetteCacheBust,
  })?.src;
}
