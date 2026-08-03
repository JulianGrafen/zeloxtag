import { DOCUMENT_BUCKET } from "./constants";

/**
 * Derives the storage object path from a public Supabase Storage URL.
 * Expected: .../object/public/vehicle-documents/{vehicleId}/{file}
 */
export function storagePathFromPublicUrl(fileUrl: string): string | null {
  if (!fileUrl || fileUrl.startsWith("mock://")) return null;

  try {
    const url = new URL(fileUrl);
    const marker = `/object/public/${DOCUMENT_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    return path || null;
  } catch {
    return null;
  }
}
