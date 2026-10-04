"use client";

/** Warm the HTTP cache for upcoming carousel / swipe images. */
export function preloadImageHrefs(hrefs: readonly (string | null | undefined)[]): void {
  if (typeof window === "undefined") return;
  const seen = new Set<string>();
  for (const href of hrefs) {
    const src = href?.trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
  }
}
