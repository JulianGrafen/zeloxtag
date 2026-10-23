/** Owner story-card hero image (session cookie / native API base). */
export function resolveShareCardStoryHeroApiPath(
  vehicleId: string,
  cacheBust?: string | number | null,
): string {
  const version =
    cacheBust != null && String(cacheBust).trim() !== ""
      ? String(cacheBust)
      : "1";
  const params = new URLSearchParams({ v: version });
  return `/api/vehicle/${vehicleId}/story-hero?${params.toString()}`;
}
