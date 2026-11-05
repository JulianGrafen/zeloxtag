"use client";

import { toShareCardImageFetchUrl } from "@/lib/share/share-card-hero-image-url";

const preloaded = new Set<string>();

/**
 * Warms the browser cache for the next cards in the deck so a swipe reveals an
 * already-decoded image instead of an empty card.
 */
export function preloadSwipeImages(srcs: ReadonlyArray<string | null | undefined>) {
  if (typeof window === "undefined") return;
  for (const raw of srcs) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const url = toShareCardImageFetchUrl(trimmed);
    if (!url || preloaded.has(url)) continue;
    preloaded.add(url);
    const img = new window.Image();
    img.decoding = "async";
    img.src = url;
    void img.decode?.().catch(() => undefined);
  }
}
