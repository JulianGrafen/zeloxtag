import { showcaseSilhouetteSwipeUrl } from "@/lib/vehicles/showcase-media-url";
import { resolveVehicleCatalogImage } from "@/lib/vehicles/vehicle-image";

export type ShowcaseSwipeHeroInput = {
  vehicleId: string;
  make: string;
  model: string;
  hasSilhouette: boolean;
  silhouetteImageUrl?: string | null;
  updatedAt?: string | number | null;
};

export type ShowcaseSwipeHero = {
  heroImageSrc: string | null;
  heroImageUsesCover: boolean;
};

/**
 * Hero for Build-Swipe cards: owner silhouette proxy when declared or storage
 * may exist; otherwise catalog cutout; last resort still tries the proxy
 * (storage without DB url).
 */
export function resolveShowcaseSwipeHero(
  input: ShowcaseSwipeHeroInput,
): ShowcaseSwipeHero {
  const vehicleId = input.vehicleId.trim();
  const hasUploaded =
    input.hasSilhouette || Boolean(input.silhouetteImageUrl?.trim());

  if (!vehicleId) {
    const catalog = resolveVehicleCatalogImage(input.make, input.model);
    return catalog
      ? { heroImageSrc: catalog.src, heroImageUsesCover: false }
      : { heroImageSrc: null, heroImageUsesCover: false };
  }

  if (!hasUploaded) {
    const catalog = resolveVehicleCatalogImage(input.make, input.model);
    if (catalog) {
      return { heroImageSrc: catalog.src, heroImageUsesCover: false };
    }
  }

  return {
    heroImageSrc: showcaseSilhouetteSwipeUrl(vehicleId, {
      silhouetteImageUrl: input.silhouetteImageUrl,
      updatedAt: input.updatedAt,
    }),
    heroImageUsesCover: hasUploaded,
  };
}
