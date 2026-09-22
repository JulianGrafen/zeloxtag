export const PRODUCT_FEATURES_BANNER_STORAGE_KEY =
  "zt_product_features_banner_v1";
export const PRODUCT_FEATURES_BANNER_VERSION = 1;

/** How long the banner stays visible before auto-dismiss. */
export const PRODUCT_FEATURES_BANNER_AUTO_DISMISS_MS = 9_000;

/** Delay after `active` before showing (avoids fighting layout paint). */
export const PRODUCT_FEATURES_BANNER_SHOW_DELAY_MS = 600;

export function hasSeenProductFeaturesBanner(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(PRODUCT_FEATURES_BANNER_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { v?: number; seen?: boolean };
    return Boolean(
      parsed.seen && parsed.v === PRODUCT_FEATURES_BANNER_VERSION,
    );
  } catch {
    return false;
  }
}

export function markProductFeaturesBannerSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PRODUCT_FEATURES_BANNER_STORAGE_KEY,
      JSON.stringify({
        v: PRODUCT_FEATURES_BANNER_VERSION,
        seen: true,
        at: new Date().toISOString(),
      }),
    );
  } catch {
    // Quota / private mode — ignore.
  }
}

export function resetProductFeaturesBanner(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PRODUCT_FEATURES_BANNER_STORAGE_KEY);
  } catch {
    // ignore
  }
}
