/** Supabase Storage bucket for transparent vehicle side-profiles. */
export const SILHOUETTE_BUCKET = "vehicle-silhouettes" as const;

/** Object path inside the bucket — one cutout per vehicle. */
export function silhouetteObjectPath(vehicleId: string): string {
  return `${vehicleId}/silhouette.png`;
}

/** Hard server-side cap for inbound photos (pre-compression). */
export const MAX_SILHOUETTE_UPLOAD_BYTES = 8 * 1024 * 1024;

/** External BG-removal HTTP timeout. */
export const REMOVE_BG_TIMEOUT_MS = 45_000;

/** Client compression targets before upload. */
export const SILHOUETTE_CLIENT_MAX_EDGE_PX = 1600;
export const SILHOUETTE_CLIENT_MAX_SIZE_MB = 1.2;
