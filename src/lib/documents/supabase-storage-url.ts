/**
 * Pure Supabase Storage URL helpers — safe for client and server bundles.
 */

/** Extract `{vehicleId}/…` object path from a Supabase Storage URL. */
export function storagePathFromPublicOrAuthenticatedUrl(
  fileUrl: string,
  bucket: string,
): string | null {
  try {
    const url = new URL(fileUrl);
    const markers = [
      `/object/public/${bucket}/`,
      `/object/authenticated/${bucket}/`,
      `/object/sign/${bucket}/`,
    ];
    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(
          url.pathname.slice(idx + marker.length),
        );
        return path && !path.includes("..") ? path : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
