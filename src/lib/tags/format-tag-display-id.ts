/**
 * Human-readable tag serial for scan ritual (e.g. #0421).
 * Derived from the public tag uuid — stable per tag, not a DB sequence.
 */
export function formatTagDisplayId(tagUuid: string): string {
  const compact = tagUuid.trim().replace(/^zlx-/i, "").replace(/-/g, "");
  const slice =
    compact.length >= 4
      ? compact.slice(-4)
      : compact.padStart(4, "0").slice(0, 4);
  const numeric = Number.parseInt(slice, 16);
  if (!Number.isFinite(numeric)) {
    return "0000";
  }
  return String(numeric % 10_000).padStart(4, "0");
}
