type ShowcaseVehicleImageSlot = "rankCard" | "swipeHero" | "showroomHero";

function photoUsesContainLayout(src: string): boolean {
  return src.includes(".svg") || src.includes("dyno-chart");
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
        return "object-contain object-bottom px-2 pb-4 pt-2";
      case "showroomHero":
        return "object-contain object-bottom px-2 pb-[28%] pt-[max(4.5rem,env(safe-area-inset-top))]";
    }
  }

  switch (slot) {
    case "rankCard":
      return "object-contain object-bottom px-1.5 pb-[42%] pt-3";
    case "swipeHero":
      return "object-contain object-bottom px-2 pb-5 pt-3";
    case "showroomHero":
      return "object-cover object-[50%_55%]";
  }
}
