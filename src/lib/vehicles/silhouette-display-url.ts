/**
 * Same-origin silhouette URLs for COEP-isolated pages.
 * Supabase public URLs are blocked as no-cors embeds without CORP.
 */

/** True when the dashboard should show an owner upload, not catalog art. */
export function isOwnerSilhouetteDisplayUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  return trimmed.startsWith("/api/vehicle/silhouette/");
}

/** Owner upload preview — blob (pre-proxy) or same-origin proxy. */
export function isOwnerSilhouetteSrc(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:")) return true;
  return isOwnerSilhouetteDisplayUrl(trimmed);
}

export function silhouetteDisplayUrl(
  vehicleId: string,
  cacheBust?: string | number | null,
): string {
  const version =
    cacheBust == null || cacheBust === ""
      ? Date.now()
      : String(cacheBust);
  return `/api/vehicle/silhouette/${vehicleId}?v=${encodeURIComponent(version)}`;
}

/** Extract `v` cache-buster from a stored Supabase silhouette URL when present. */
export function cacheBustFromSilhouetteUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("v");
  } catch {
    const match = /[?&]v=([^&]+)/.exec(url);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}
