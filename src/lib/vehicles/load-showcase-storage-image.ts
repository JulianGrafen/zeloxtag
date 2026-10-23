import "server-only";

import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/security/file-upload";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

/** Resolve a showcase document `src` to a storage path under the vehicle prefix. */
export function resolveShowcaseStoragePath(
  vehicleId: string,
  src: string,
): string | null {
  const fromUrl = storagePathFromPublicOrAuthenticatedUrl(src, DOCUMENT_BUCKET);
  if (fromUrl?.startsWith(`${vehicleId}/`)) {
    return fromUrl;
  }

  const bare = src.trim().split("?")[0]?.split("#")[0] ?? "";
  if (bare.startsWith(`${vehicleId}/`) && !bare.includes("..")) {
    return bare;
  }

  return null;
}

/** Load raw image bytes from the documents bucket (owner / OG contexts). */
export async function loadShowcaseStorageImageBytes(
  vehicleId: string,
  src: string,
): Promise<Uint8Array | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const storagePath = resolveShowcaseStoragePath(vehicleId, src);
  if (!storagePath) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .download(storagePath);

  if (error || !data) {
    return null;
  }

  return new Uint8Array(await data.arrayBuffer());
}
