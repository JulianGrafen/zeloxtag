const SESSION_PREFIX = "zlx-tag-scan-ritual:";

export const TAG_SCAN_RITUAL_DURATION_MS = 1_200;

export type TagScanRitualSearchParams = {
  showcase?: string | null;
  tour?: string | null;
  checkout?: string | null;
  session_id?: string | null;
  freeScanWelcome?: string | null;
};

/** Server-side: skip ritual for in-app deep links and post-checkout returns. */
export function isTagScanRitualSuppressedBySearch(
  params: TagScanRitualSearchParams,
): boolean {
  if (params.showcase === "1") return true;
  if (params.tour === "1") return true;
  if (params.checkout === "1") return true;
  if (params.session_id?.startsWith("cs_")) return true;
  if (params.freeScanWelcome === "1") return true;
  return false;
}

/**
 * Client-only: true when this tab has not yet played the ritual for this tag.
 * Marks the session when returning true.
 */
export function consumeTagScanRitualForSession(tagUuid: string): boolean {
  if (typeof sessionStorage === "undefined") {
    return true;
  }
  try {
    const key = `${SESSION_PREFIX}${tagUuid}`;
    if (sessionStorage.getItem(key) === "1") {
      return false;
    }
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export function buildTagScanRitualTicker(displayId: string): string {
  return `V4A TAG VERIFIED · ID #${displayId} · SECURE LINK · `;
}
