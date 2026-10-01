/** True while a route transition is in flight (hides global legal footer flash). */
let routeTransitionLoadingActive = false;
const listeners = new Set<() => void>();

/** Matches nav view-transition duration (~0.42s in globals). */
const ROUTE_TRANSITION_FOOTER_HOLD_MS = 480;

let releaseTimer: ReturnType<typeof setTimeout> | undefined;

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function isRouteTransitionLoadingActive(): boolean {
  return routeTransitionLoadingActive;
}

export function activateRouteTransitionLoading(): void {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = undefined;
  }
  if (routeTransitionLoadingActive) return;
  routeTransitionLoadingActive = true;
  notifyListeners();
}

export function scheduleDeactivateRouteTransitionLoading(
  delayMs = ROUTE_TRANSITION_FOOTER_HOLD_MS,
): void {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
  }
  releaseTimer = setTimeout(() => {
    releaseTimer = undefined;
    if (!routeTransitionLoadingActive) return;
    routeTransitionLoadingActive = false;
    notifyListeners();
  }, delayMs);
}

/** @deprecated Prefer activate / scheduleDeactivate for nav transitions. */
export function setRouteTransitionLoadingActive(active: boolean): void {
  if (active) {
    activateRouteTransitionLoading();
    return;
  }
  scheduleDeactivateRouteTransitionLoading(0);
}

export function subscribeRouteTransitionLoading(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
