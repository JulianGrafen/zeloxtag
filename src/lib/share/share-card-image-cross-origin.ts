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

export function shareCardHeroImageClassName(src: string | undefined): string {
  if (isShareCardCutoutHero(src)) {
    return "absolute inset-x-0 bottom-0 h-[92%] w-full object-contain object-bottom";
  }
  return "absolute inset-0 h-full w-full object-cover object-[50%_55%]";
}
