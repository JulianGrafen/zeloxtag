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
  if (!path.includes("/entdecken")) return null;
  return path;
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
