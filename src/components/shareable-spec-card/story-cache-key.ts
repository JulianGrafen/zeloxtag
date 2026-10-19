import type { ShareCardVariant } from "@/lib/share/share-card-variant";

import type { ShareableBuildData } from "./types";

/** Stable key so we can pre-render the Story PNG when card data changes. */
export function buildStoryCardCacheKey(
  data: ShareableBuildData,
  variant?: ShareCardVariant,
): string {
  return JSON.stringify({
    modelName: data.modelName,
    instagramHandle: data.instagramHandle,
    imageUrl: data.imageUrl,
    modificationsCount: data.modificationsCount,
    specRows: data.specRows,
    buildDna: data.buildDna,
    weeklyShowcaseRank: data.weeklyShowcaseRank,
    format: variant?.format ?? "story",
    style: variant?.style ?? "showcase",
  });
}
