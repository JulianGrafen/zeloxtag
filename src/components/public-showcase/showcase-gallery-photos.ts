import type { PublicGalleryPhoto } from "@/lib/vehicles/public-showcase-data";

export function filterVisibleGalleryPhotos(
  photos: readonly PublicGalleryPhoto[],
): PublicGalleryPhoto[] {
  return [...photos];
}

export function photoUsesContainLayout(src: string): boolean {
  return src.includes(".svg") || src.includes("dyno-chart");
}

export function resolveHeroPhotoIndex(
  photos: readonly PublicGalleryPhoto[],
  heroImageSrc: string | null,
): number {
  if (photos.length === 0) return 0;
  if (!heroImageSrc) return 0;
  const index = photos.findIndex((photo) => photo.src === heroImageSrc);
  return index >= 0 ? index : 0;
}
