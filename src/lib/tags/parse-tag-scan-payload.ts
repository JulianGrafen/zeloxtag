import { isPlaqueTagUuid } from "@/lib/tags/plaque-qr";

/**
 * Extracts a Zelox tag UUID from a QR payload (raw UUID or /v/{uuid} URL).
 */
export function parseTagUuidFromScanPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (isPlaqueTagUuid(trimmed)) {
    return trimmed.toLowerCase();
  }

  const pathUuid = trimmed.match(
    /\/v\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i,
  )?.[1];
  if (pathUuid && isPlaqueTagUuid(pathUuid)) {
    return pathUuid.toLowerCase();
  }

  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, "https://app.zeloxtag.de");
    const segment = url.pathname.split("/").filter(Boolean);
    const vIndex = segment.indexOf("v");
    if (vIndex >= 0 && segment[vIndex + 1] && isPlaqueTagUuid(segment[vIndex + 1])) {
      return segment[vIndex + 1].toLowerCase();
    }
  } catch {
    // Not a URL — ignore.
  }

  return null;
}
