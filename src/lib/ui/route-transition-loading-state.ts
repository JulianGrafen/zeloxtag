/** True while a route `loading.tsx` shell is mounted (hides global legal footer flash). */
let routeTransitionLoadingActive = false;
const listeners = new Set<() => void>();

export function isRouteTransitionLoadingActive(): boolean {
  return routeTransitionLoadingActive;
}

export function setRouteTransitionLoadingActive(active: boolean): void {
  if (routeTransitionLoadingActive === active) return;
  routeTransitionLoadingActive = active;
  listeners.forEach((listener) => listener());
}

export function subscribeRouteTransitionLoading(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
