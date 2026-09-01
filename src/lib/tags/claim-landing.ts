import type { TagScanResult } from "@/types/database";

import { MOCK_TAG_UUIDS } from "./mock-tags";
import { isPlaqueTagUuid } from "./plaque-qr";

/**
 * Identical copy for missing, already-claimed, and lost races.
 * Distinct messages were a POST oracle for unclaimed inventory.
 */
export const CLAIM_UNAVAILABLE_MESSAGE =
  "Dieser Tag kann nicht beansprucht werden.";

/**
 * Identifiers that may show the claim UI without revealing whether a row exists.
 * Real plaques are UUID v4; the demo unclaimed slug is an explicit exception.
 */
export function isClaimLandingIdentifier(identifier: string): boolean {
  const id = identifier.trim();
  return isPlaqueTagUuid(id) || id === MOCK_TAG_UUIDS.unclaimed;
}

export type PublicScanLookupKind = "tag" | "absent" | "try-slug";

/**
 * Public `/v/{id}` resolution must not distinguish missing vs unclaimed tags.
 * UUID-shaped ids are never share slugs (slugs are 8–32 chars, no hyphens).
 */
export function publicScanLookupKind(
  identifier: string,
  tagResult: TagScanResult | null,
): PublicScanLookupKind {
  if (tagResult?.tag.status === "active" && tagResult.vehicle) {
    return "tag";
  }
  if (tagResult) {
    return "absent";
  }
  if (isPlaqueTagUuid(identifier.trim())) {
    return "absent";
  }
  return "try-slug";
}
