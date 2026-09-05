import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  isLikelyImageBytes,
  isLikelyImageResponse,
} from "@/lib/vehicles/silhouette-bytes";
import {
  legacySilhouetteObjectPath,
  SILHOUETTE_BUCKET,
  vehiclePhotoObjectPath,
} from "@/lib/vehicles/silhouette-constants";

function isAllowedSilhouetteFetchUrl(url: string, supabaseOrigin: string): boolean {
  try {
    return new URL(url).origin === new URL(supabaseOrigin).origin;
  } catch {
    return false;
  }
}

async function fetchRemoteSilhouetteBytes(
  url: string,
  supabaseOrigin: string,
): Promise<Uint8Array | null> {
  if (!supabaseOrigin || !isAllowedSilhouetteFetchUrl(url, supabaseOrigin)) {
    return null;
  }
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    if (!isLikelyImageResponse(contentType, bytes)) return null;
    return bytes;
  } catch {
    return null;
  }
}

/** Load raw vehicle hero/silhouette bytes from storage or legacy URL. */
export async function loadVehicleSilhouetteBytes(
  vehicleId: string,
): Promise<Uint8Array | null> {
  const { url: supabaseUrl } = getSupabaseEnv();
  let supabaseOrigin = "";
  try {
    supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  } catch {
    supabaseOrigin = "";
  }

  const admin = createAdminClient();
  const objectPaths = [
    vehiclePhotoObjectPath(vehicleId),
    legacySilhouetteObjectPath(vehicleId),
  ];

  for (const objectPath of objectPaths) {
    const { data, error } = await admin.storage
      .from(SILHOUETTE_BUCKET)
      .download(objectPath);

    if (!error && data) {
      const bytes = new Uint8Array(await data.arrayBuffer());
      if (isLikelyImageBytes(bytes)) {
        return bytes;
      }
    }
  }

  for (const objectPath of objectPaths) {
    const { data: signed, error: signedError } = await admin.storage
      .from(SILHOUETTE_BUCKET)
      .createSignedUrl(objectPath, 120);

    if (!signedError && signed?.signedUrl) {
      const signedBytes = await fetchRemoteSilhouetteBytes(
        signed.signedUrl,
        supabaseOrigin,
      );
      if (signedBytes && isLikelyImageBytes(signedBytes)) {
        return signedBytes;
      }
    }
  }

  const { data: vehicle, error: vehicleError } = await admin
    .from("vehicles")
    .select("silhouette_image_url")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError || !vehicle?.silhouette_image_url) {
    return null;
  }

  return fetchRemoteSilhouetteBytes(
    vehicle.silhouette_image_url,
    supabaseOrigin,
  );
}
