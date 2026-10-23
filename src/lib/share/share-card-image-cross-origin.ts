import { showcaseVehicleFocusImageClassName } from "@/lib/image/showcase-vehicle-focus-image";
import { isOpaqueCatalogPhotoSrc } from "@/lib/vehicles/vehicle-image";

/** html-to-image: same-origin imgs must not use anonymous CORS (drops session cookies). */
export function shareCardImageCrossOrigin(
  src: string | undefined,
): "anonymous" | undefined {
  const trimmed = src?.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return undefined;
  }
  if (trimmed.startsWith("/")) {
    return undefined;
  }
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    if (new URL(trimmed, origin).origin === origin) {
      return undefined;
    }
  } catch {
    return "anonymous";
  }
  return "anonymous";
}

export function isShareCardCatalogCutout(src: string | undefined): boolean {
  return Boolean(src?.includes("/api/vehicle/catalog/"));
}

/** Transparent catalog cutout only — owner photos & silhouettes use showroom cover. */
export function isShareCardCutoutHero(src: string | undefined): boolean {
  const trimmed = src?.trim();
  if (!trimmed) return false;
  if (!isShareCardCatalogCutout(trimmed)) return false;
  return !isOpaqueCatalogPhotoSrc(trimmed);
}

export function shareCardHeroImageClassName(
  src: string | undefined,
  variant: "showcase" | "rank" = "showcase",
): string {
  if (variant === "rank") {
    return "absolute inset-0 h-full w-full object-cover object-[50%_48%] scale-[1.06]";
  }

  const focus = showcaseVehicleFocusImageClassName(src ?? "", "showroomHero");
  const opaqueScale = isOpaqueCatalogPhotoSrc(src) ? "scale-[1.07]" : "";
  return `absolute inset-0 h-full w-full ${focus} ${opaqueScale}`.trim();
}
