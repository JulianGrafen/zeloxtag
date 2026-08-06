import type { SupabaseClient } from "@supabase/supabase-js";

import { SILHOUETTE_BUCKET, silhouetteObjectPath } from "./silhouette-constants";

const DEFAULT_ATTEMPTS = 8;
const DEFAULT_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Poll storage until the silhouette PNG is readable (handles propagation delay).
 */
export async function verifySilhouetteInStorage(
  admin: SupabaseClient,
  vehicleId: string,
  options?: { attempts?: number; delayMs?: number },
): Promise<boolean> {
  const attempts = options?.attempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  const objectPath = silhouetteObjectPath(vehicleId);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data, error } = await admin.storage
      .from(SILHOUETTE_BUCKET)
      .download(objectPath);

    if (!error && data && data.size > 32) {
      return true;
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs * (attempt + 1));
    }
  }

  return false;
}
