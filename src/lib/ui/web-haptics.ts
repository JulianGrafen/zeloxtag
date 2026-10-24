/** Dry cockpit tap — Android Chrome & supporting desktop browsers. */
export const WEB_HAPTIC_TAP_MS = 15;

export function canUseWebVibrate(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

/**
 * Ultrashort vibration on intentional tap (tiles, soundcheck).
 * No-op when unsupported or reduced motion is preferred.
 */
export function playWebHapticTap(): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  if (!canUseWebVibrate()) return;
  try {
    navigator.vibrate(WEB_HAPTIC_TAP_MS);
  } catch {
    /* private mode / policy */
  }
}
