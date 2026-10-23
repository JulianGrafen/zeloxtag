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

/** Transparent cutout / silhouette — contain on dark. Photos use full-bleed cover + fade. */
export function isShareCardCutoutHero(src: string | undefined): boolean {
  const trimmed = src?.trim();
  if (!trimmed) return false;
  if (isOpaqueCatalogPhotoSrc(trimmed)) return false;
  return (
    isShareCardCatalogCutout(trimmed) ||
    trimmed.includes("/api/vehicle/silhouette/")
  );
}

export function shareCardHeroImageClassName(
  src: string | undefined,
  variant: "showcase" | "rank" = "showcase",
): string {
  if (isShareCardCutoutHero(src)) {
    return "absolute inset-x-0 bottom-0 h-full w-full origin-bottom scale-[1.14] object-contain object-bottom";
  }
  if (variant === "rank") {
    return "absolute inset-0 h-full w-full object-cover object-[50%_48%] scale-[1.06]";
  }
  return "absolute inset-0 h-full w-full object-cover object-[50%_52%] scale-[1.04]";
}
