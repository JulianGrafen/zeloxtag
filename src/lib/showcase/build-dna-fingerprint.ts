import { createHash } from "node:crypto";

import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

/** Stable hash of public showcase mods — drives cache invalidation. */
export function buildShowcaseModsFingerprint(
  modifications: readonly PublicModification[],
): string {
  const payload = modifications
    .map((mod) => ({
      id: mod.id,
      label: mod.label,
      category: mod.category,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
