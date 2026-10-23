const PUBLIC_VEHICLE_FILE_RE =
  /^\/api\/public\/vehicle\/([^/]+)\/file(?:\?|$)/i;

/** Owner-authenticated gallery proxy (private showcase). */
export function ownerShowcaseFileApiPath(
  vehicleId: string,
  storageSrc: string,
  maxEdgePx?: number,
): string {
  const params = new URLSearchParams({ src: storageSrc });
  if (maxEdgePx != null && maxEdgePx > 0) {
    params.set("w", String(Math.round(maxEdgePx)));
  }
  return `/api/vehicle/${vehicleId}/showcase-file?${params.toString()}`;
}

/**
 * Rewrites public showcase file URLs to the owner proxy when the vehicle is not public.
 */
export function toOwnerShareCardHeroSrc(
  vehicleId: string,
  heroSrc: string | null | undefined,
  isPublicShowcase: boolean,
): string | null {
  const trimmed = heroSrc?.trim();
  if (!trimmed || isPublicShowcase) {
    return trimmed ?? null;
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    const match = parsed.pathname.match(PUBLIC_VEHICLE_FILE_RE);
    const id = match?.[1]?.trim();
    const src = parsed.searchParams.get("src")?.trim();
    const w = parsed.searchParams.get("w");
    if (!id || id !== vehicleId || !src) {
      return trimmed;
    }
    const maxEdge = w ? Number.parseInt(w, 10) : undefined;
    return ownerShowcaseFileApiPath(
      vehicleId,
      src,
      Number.isFinite(maxEdge) ? maxEdge : undefined,
    );
  } catch {
    return trimmed;
  }
}
