import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

/** Owner dashboard: physical tag twin or digital garage when no active tag. */
export function pickOwnerSurfacePath(
  vehicleId: string,
  activeTagUuid: string | null | undefined,
): string {
  const id = vehicleId.trim();
  const tag = activeTagUuid?.trim();
  if (
    tag &&
    !isDemoActiveTag(tag) &&
    tag !== MOCK_TAG_UUIDS.unclaimed
  ) {
    return `/v/${tag}`;
  }
  return `/garage/${id}`;
}
