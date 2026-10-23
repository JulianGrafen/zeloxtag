import type { ShareCardVariant } from "@/lib/share/share-card-variant";
import {
  DEFAULT_SHARE_CARD_FORMAT,
  DEFAULT_SHARE_CARD_STYLE,
  shareCardQuerySchema,
} from "@/lib/share/share-card-variant";

const STORAGE_PREFIX = "zelox:share-card-variant:";

function storageKey(vehicleId: string): string {
  return `${STORAGE_PREFIX}${vehicleId.trim()}`;
}

export function readShareCardVariantFromSession(
  vehicleId: string | undefined,
): ShareCardVariant | null {
  if (typeof window === "undefined" || !vehicleId?.trim()) {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(storageKey(vehicleId));
    if (!raw) return null;
    const parsed = shareCardQuerySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeShareCardVariantToSession(
  vehicleId: string | undefined,
  variant: ShareCardVariant,
): void {
  if (typeof window === "undefined" || !vehicleId?.trim()) {
    return;
  }
  try {
    sessionStorage.setItem(storageKey(vehicleId), JSON.stringify(variant));
  } catch {
    /* quota / private mode */
  }
}

export function resolveInitialShareCardVariant(
  vehicleId: string | undefined,
  defaults: ShareCardVariant,
  options?: { preferRankHeroStyle?: boolean },
): ShareCardVariant {
  const stored = readShareCardVariantFromSession(vehicleId);
  if (stored) {
    if (
      options?.preferRankHeroStyle &&
      stored.style === DEFAULT_SHARE_CARD_STYLE
    ) {
      return { format: stored.format, style: "rankHero" };
    }
    return stored;
  }
  return {
    format: defaults.format ?? DEFAULT_SHARE_CARD_FORMAT,
    style: defaults.style ?? DEFAULT_SHARE_CARD_STYLE,
  };
}
