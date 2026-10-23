/** True when the live share-card preview has a loaded hero image (export root). */
export function isShareCardPreviewHeroReady(
  exportRoot: HTMLElement | null | undefined,
): boolean {
  if (!exportRoot) {
    return false;
  }
  const hero = exportRoot.querySelector<HTMLImageElement>(
    "img[data-share-card-hero]",
  );
  if (!hero) {
    return false;
  }
  return hero.complete && hero.naturalWidth > 0 && hero.naturalHeight > 0;
}
