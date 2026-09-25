import { createHash } from "node:crypto";

import { BUILD_DNA_SCHEMA_VERSION } from "@/lib/showcase/build-dna-schema";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

const FINGERPRINT_PREFIX = `v${BUILD_DNA_SCHEMA_VERSION}:`;

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

  const digest = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  return `${FINGERPRINT_PREFIX}${digest}`;
}
