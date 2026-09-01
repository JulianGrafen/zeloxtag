import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/security/file-upload";

import { DOCUMENT_BUCKET } from "./constants";

/** `{vehicleId}/{documentId}-filename.pdf` stored without host prefix. */
const STORAGE_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i;

export function isDocumentStoragePath(fileUrl: string): boolean {
  return STORAGE_PATH_RE.test(fileUrl.trim());
}

export function documentStorageObjectPath(
  vehicleId: string,
  documentId: string,
  safeName: string,
): string {
  return `${vehicleId}/${documentId}-${safeName}`;
}

/**
 * Object path for `vehicle-documents`: a relative `{vehicleId}/{documentId}-…`
 * value, or a legacy public / authenticated / signed Storage URL.
 */
export function resolveStoragePath(fileUrl: string): string | null {
  if (
    !fileUrl ||
    fileUrl.startsWith("mock://") ||
    fileUrl.startsWith("manual://") ||
    fileUrl.startsWith("/demo/")
  ) {
    return null;
  }

  const trimmed = fileUrl.trim();
  if (!trimmed || trimmed.includes("..")) return null;

  if (isDocumentStoragePath(trimmed)) {
    return trimmed;
  }

  const fromUrl = storagePathFromPublicOrAuthenticatedUrl(
    trimmed,
    DOCUMENT_BUCKET,
  );
  if (!fromUrl || fromUrl.includes("..")) return null;
  return fromUrl;
}

/** @deprecated Use {@link resolveStoragePath}. */
export function storagePathFromPublicUrl(fileUrl: string): string | null {
  return resolveStoragePath(fileUrl);
}
