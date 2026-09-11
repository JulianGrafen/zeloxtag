const STORAGE_PREFIX = "zlx-silhouette-url:";
const VERSION_PREFIX = "zlx-silhouette-v:";

export function silhouetteSessionKey(vehicleId: string): string {
  return `${STORAGE_PREFIX}${vehicleId}`;
}

function silhouetteVersionSessionKey(vehicleId: string): string {
  return `${VERSION_PREFIX}${vehicleId}`;
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

/** Cache-buster for the same-origin silhouette proxy (storage path never changes on replace). */
export function readSilhouetteVersionFromSession(
  vehicleId: string,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(silhouetteVersionSessionKey(vehicleId));
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function writeSilhouetteToSession(
  vehicleId: string,
  storageUrl: string,
  cacheBust?: string | number | null,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(silhouetteSessionKey(vehicleId), storageUrl);
    if (cacheBust != null && String(cacheBust).trim() !== "") {
      sessionStorage.setItem(
        silhouetteVersionSessionKey(vehicleId),
        String(cacheBust),
      );
    }
  } catch {
    /* quota / private mode */
  }
}

export function clearSilhouetteFromSession(vehicleId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(silhouetteSessionKey(vehicleId));
    sessionStorage.removeItem(silhouetteVersionSessionKey(vehicleId));
  } catch {
    /* ignore */
  }
}
