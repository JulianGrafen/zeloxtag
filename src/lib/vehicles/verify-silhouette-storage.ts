import type { SupabaseClient } from "@supabase/supabase-js";

import {
  legacySilhouetteObjectPath,
  SILHOUETTE_BUCKET,
  vehiclePhotoObjectPath,
} from "./silhouette-constants";

const DEFAULT_ATTEMPTS = 6;
const DEFAULT_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function objectReadable(
  admin: SupabaseClient,
  objectPath: string,
): Promise<boolean> {
  const { data, error } = await admin.storage
    .from(SILHOUETTE_BUCKET)
    .download(objectPath);

  return !error && data && data.size > 32;
}

/**
 * Poll storage until the vehicle photo is readable (handles propagation delay).
 */
export async function verifySilhouetteInStorage(
  admin: SupabaseClient,
  vehicleId: string,
  options?: { attempts?: number; delayMs?: number },
): Promise<boolean> {
  const attempts = options?.attempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  const paths = [
    vehiclePhotoObjectPath(vehicleId),
    legacySilhouetteObjectPath(vehicleId),
  ];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    for (const objectPath of paths) {
      if (await objectReadable(admin, objectPath)) {
        return true;
      }
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs * (attempt + 1));
    }
  }

  return false;
}
