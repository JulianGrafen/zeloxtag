import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/security/file-upload";

import { DOCUMENT_BUCKET } from "./constants";

/**
 * Derives the storage object path from a Supabase Storage URL
 * (public, authenticated, or signed object path).
 */
export function storagePathFromPublicUrl(fileUrl: string): string | null {
  if (!fileUrl || fileUrl.startsWith("mock://") || fileUrl.startsWith("manual://")) {
    return null;
  }
  return storagePathFromPublicOrAuthenticatedUrl(fileUrl, DOCUMENT_BUCKET);
}
