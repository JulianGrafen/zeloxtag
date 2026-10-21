import { isOpaqueCatalogPhotoSrc } from "@/lib/vehicles/vehicle-image";

type ShowcaseVehicleImageSlot = "rankCard" | "swipeHero" | "showroomHero";

function photoUsesContainLayout(src: string): boolean {
  return src.includes(".svg") || src.includes("dyno-chart");
}

/** Top Builds rank cards: owner photos cover; catalog cutouts contain on dark. */
export function weeklyRankCardHeroImageClassName(
  src: string,
  useCoverLayout: boolean,
): string {
  if (useCoverLayout) {
    return "object-cover object-[50%_48%] brightness-[1.03]";
  }
  return showcaseVehicleFocusImageClassName(src, "rankCard");
}

/**
 * Keeps the vehicle in frame (contain + bottom anchor) instead of cropping with cover.
 */
export function showcaseVehicleFocusImageClassName(
  src: string,
  slot: ShowcaseVehicleImageSlot,
): string {
  if (photoUsesContainLayout(src)) {
    switch (slot) {
      case "rankCard":
        return "object-contain object-bottom px-2 pb-[42%] pt-2";
      case "swipeHero":
        return "object-cover object-[50%_55%]";
      case "showroomHero":
        return "object-contain object-bottom px-2 pb-[28%] pt-[max(4.5rem,env(safe-area-inset-top))]";
    }
  }

  switch (slot) {
    case "rankCard":
      return "object-contain object-bottom px-1.5 pb-[42%] pt-3";
    case "swipeHero":
      return "object-cover object-[50%_55%]";
    case "showroomHero":
      return isOpaqueCatalogPhotoSrc(src)
        ? "object-cover object-[50%_54%]"
        : "object-cover object-[50%_55%]";
  }
}
