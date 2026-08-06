import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_SILHOUETTE_UPLOAD_BYTES,
  SILHOUETTE_BUCKET,
} from "./silhouette-constants";

const VEHICLE_PHOTO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/**
 * Hosted projects may still have PNG-only buckets from early migrations.
 * Service role can widen MIME types without a manual SQL run.
 */
export async function ensureVehicleSilhouetteBucket(
  admin: SupabaseClient,
): Promise<void> {
  const { error } = await admin.storage.updateBucket(SILHOUETTE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_SILHOUETTE_UPLOAD_BYTES,
    allowedMimeTypes: [...VEHICLE_PHOTO_MIME_TYPES],
  });

  if (error) {
    console.warn("[vehicle-photo] bucket ensure failed", error.message);
  }
}

export function isStorageMimeRejected(message: string): boolean {
  return /mime type|not supported/i.test(message);
}
