import type { SupabaseClient } from "@supabase/supabase-js";

import { ALLOWED_DOCUMENT_MIME_TYPES } from "@/lib/documents/constants";
import {
  ENGINE_SOUND_BUCKET,
  ENGINE_SOUND_MAX_BYTES,
} from "@/lib/vehicles/engine-sound-constants";

const ENGINE_SOUND_STORAGE_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
] as const;

/**
 * Hosted projects may lack audio MIME types on vehicle-documents until migration
 * 00057 runs — widen via service role (same pattern as silhouette photos).
 */
export async function ensureVehicleEngineSoundBucket(
  admin: SupabaseClient,
): Promise<void> {
  const allowedMimeTypes = [
    ...ALLOWED_DOCUMENT_MIME_TYPES,
    ...ENGINE_SOUND_STORAGE_MIME_TYPES,
  ];

  const { error } = await admin.storage.updateBucket(ENGINE_SOUND_BUCKET, {
    public: false,
    fileSizeLimit: ENGINE_SOUND_MAX_BYTES,
    allowedMimeTypes: [...allowedMimeTypes],
  });

  if (error) {
    console.warn("[vehicle-engine-sound] bucket ensure failed", error.message);
  }
}

export { isStorageMimeRejected } from "@/lib/vehicles/ensure-silhouette-bucket";
