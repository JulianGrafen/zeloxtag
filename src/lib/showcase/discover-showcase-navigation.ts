/** Relative return URL after viewing a showcase from Builds entdecken. */
export function sanitizeDiscoverBackHref(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("://") || path.includes("\\")) return null;
  if (path === "/swipe") return path;
  if (!path.includes("/entdecken")) return null;
  return path;
}

/** Return path after viewing a showcase from anonymous public swipe. */
export const PUBLIC_SWIPE_DISCOVER_BACK_HREF = "/swipe";

const VEHICLE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Vehicle UUID is not a valid `/v/{slug}` entry (needs tag UUID or public_slug). */
export function isVehicleUuidLike(value: string): boolean {
  return VEHICLE_UUID_RE.test(value.trim());
}

/** Slug safe for showcase deep links from swipe decks. */
export function isNavigableShowcasePublicSlug(publicSlug: string): boolean {
  const trimmed = publicSlug.trim();
  if (!trimmed) return false;
  return !isVehicleUuidLike(trimmed);
}

export function buildDiscoverShowcaseHref(
  publicSlug: string,
  entdeckenHref: string,
): string {
  const params = new URLSearchParams({
    showcase: "1",
    back: entdeckenHref,
  });
  return `/v/${publicSlug}?${params.toString()}`;
}
