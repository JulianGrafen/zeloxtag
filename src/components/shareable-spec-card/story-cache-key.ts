import type { ShareableBuildData } from "./types";

/** Stable key so we can pre-render the Story PNG when card data changes. */
export function buildStoryCardCacheKey(data: ShareableBuildData): string {
  return JSON.stringify({
    modelName: data.modelName,
    instagramHandle: data.instagramHandle,
    imageUrl: data.imageUrl,
    modificationsCount: data.modificationsCount,
    specRows: data.specRows,
    buildDna: data.buildDna,
  });
}
