import { showcaseVehicleFocusImageClassName } from "@/lib/image/showcase-vehicle-focus-image";

export type SwipeCardHeroPresentation = {
  imageClassName: string;
  objectFit: "cover" | "contain";
};

function isSilhouetteHero(src: string): boolean {
  return src.includes("/api/vehicle/silhouette/");
}

export function swipeCardHeroUsesCoverLayout(src: string): boolean {
  if (src.includes(".svg") || src.includes("dyno-chart")) {
    return false;
  }
  if (src.includes("/api/vehicle/catalog/")) {
    return false;
  }
  if (src.startsWith("/vehicles/")) {
    return false;
  }
  if (isSilhouetteHero(src)) {
    return true;
  }
  return true;
}

/** Owner silhouette proxy — zoom so the car fills the 9:16 card (PNG often has padding). */
function silhouetteSwipeHeroPresentation(
  usesCover: boolean,
): SwipeCardHeroPresentation {
  if (usesCover) {
    return {
      objectFit: "cover",
      imageClassName:
        "object-cover object-[50%_56%] scale-[1.28] [transform-origin:50%_56%]",
    };
  }
  return {
    objectFit: "contain",
    imageClassName:
      "object-contain object-bottom px-1 pb-[10%] pt-2 scale-[1.14] [transform-origin:50%_100%]",
  };
}

export function resolveSwipeCardHeroPresentation(
  src: string,
  heroImageUsesCover?: boolean,
): SwipeCardHeroPresentation {
  if (isSilhouetteHero(src)) {
    return silhouetteSwipeHeroPresentation(heroImageUsesCover !== false);
  }

  if (!swipeCardHeroUsesCoverLayout(src)) {
    return {
      objectFit: "contain",
      imageClassName:
        "object-contain object-bottom px-2 pb-[12%] pt-4 scale-[1.06] [transform-origin:50%_100%]",
    };
  }

  return {
    objectFit: "cover",
    imageClassName: showcaseVehicleFocusImageClassName(src, "swipeHero"),
  };
}

/** @deprecated Prefer resolveSwipeCardHeroPresentation */
export function swipeCardHeroImageClassName(src: string): string {
  return resolveSwipeCardHeroPresentation(src).imageClassName;
}
