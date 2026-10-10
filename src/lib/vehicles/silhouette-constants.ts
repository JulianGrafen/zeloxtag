/** Supabase Storage bucket for owner vehicle header photos. */
export const SILHOUETTE_BUCKET = "vehicle-silhouettes" as const;

/** Object path in storage — one photo per vehicle (PNG, works on all buckets). */
export function vehiclePhotoObjectPath(vehicleId: string): string {
  return `${vehicleId}/silhouette.png`;
}

/** Legacy alias used by older reads. */
export function legacySilhouetteObjectPath(vehicleId: string): string {
  return vehiclePhotoObjectPath(vehicleId);
}

/** @deprecated Use vehiclePhotoObjectPath — kept for older tooling references. */
export function silhouetteObjectPath(vehicleId: string): string {
  return vehiclePhotoObjectPath(vehicleId);
}

/** Hard server-side cap for inbound photos (pre-compression). */
export const MAX_SILHOUETTE_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Dashboard hero — full tile width at ~2–3× retina (proxy `w` cap). */
export const SILHOUETTE_DASHBOARD_THUMB_MAX_EDGE = 960;

/** Build-Swipe card (~max 512px wide, 9:16). */
export const SILHOUETTE_SHOWCASE_SWIPE_MAX_EDGE = 520;

/** Public showcase hero carousel (full width, ~2× retina cap). */
export const SILHOUETTE_SHOWCASE_HERO_MAX_EDGE = 960;

/** Gallery photos in public showcase / lightbox. */
export const SILHOUETTE_SHOWCASE_GALLERY_MAX_EDGE = 1280;

/** Client compression targets before upload. */
export const SILHOUETTE_CLIENT_MAX_EDGE_PX = 1600;
export const SILHOUETTE_CLIENT_MAX_SIZE_MB = 0.85;
