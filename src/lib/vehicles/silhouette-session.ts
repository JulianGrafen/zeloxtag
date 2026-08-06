const STORAGE_PREFIX = "zlx-silhouette-url:";

export function silhouetteSessionKey(vehicleId: string): string {
  return `${STORAGE_PREFIX}${vehicleId}`;
}

/** Last known Supabase silhouette URL for this vehicle (survives soft navigations). */
export function readSilhouetteFromSession(vehicleId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(silhouetteSessionKey(vehicleId));
  } catch {
    return null;
  }
}

export function writeSilhouetteToSession(
  vehicleId: string,
  storageUrl: string,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(silhouetteSessionKey(vehicleId), storageUrl);
  } catch {
    /* quota / private mode */
  }
}
