import type { DocumentLineItem } from "@/types/database";

const PART_NUMBER =
  /\b(?:art\.?\s*-?\s*nr\.?|artikel(?:nummer)?|sachnummer|teil(?:enummer)?|oem|ref\.?)\s*[:#]?\s*([A-Z0-9][A-Z0-9./\-]{4,})\b/i;

const EMBEDDED_PART = /\b([A-Z]{1,4}[- ]?[0-9]{5,}[A-Z0-9/-]*)\b/;

const OIL_KEYWORDS =
  /motor[oö]l|engine\s*oil|[oö]lfilter|oil\s*filter|serviceol|5w-?\d{2}|0w-?\d{2}/i;

const BRAKE_KEYWORDS =
  /bremsbel|bremsscheib|brake\s*pad|brake\s*disc|bremsklotz/i;

export type ServicePartKind = "oil_change" | "brake_pads";

function extractFromLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const labeled = trimmed.match(PART_NUMBER);
  if (labeled?.[1]) return labeled[1].replace(/\s+/g, "").slice(0, 64);

  const embedded = trimmed.match(EMBEDDED_PART);
  if (embedded?.[1]) return embedded[1].replace(/\s+/g, "").slice(0, 64);

  return null;
}

function lineMatchesKind(label: string, kind: ServicePartKind): boolean {
  if (kind === "oil_change") return OIL_KEYWORDS.test(label);
  return BRAKE_KEYWORDS.test(label);
}

export function extractServicePartNumberFromLineItems(
  lineItems: DocumentLineItem[] | null | undefined,
  kind: ServicePartKind,
): string | null {
  if (!lineItems?.length) return null;

  for (const item of lineItems) {
    const label = item.label?.trim() ?? "";
    if (!label || !lineMatchesKind(label, kind)) continue;
    const part = extractFromLabel(label);
    if (part) return part;
  }

  for (const item of lineItems) {
    const label = item.label?.trim() ?? "";
    if (!label) continue;
    const part = extractFromLabel(label);
    if (part && lineMatchesKind(label, kind)) return part;
  }

  return null;
}
