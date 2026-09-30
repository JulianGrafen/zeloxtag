import { createHash } from "node:crypto";

import type { BuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

/** Bump when fingerprint inputs change (independent of DNA JSON schema version). */
const FINGERPRINT_VERSION = 3;
const FINGERPRINT_PREFIX = `v${FINGERPRINT_VERSION}:`;

function modsPayload(modifications: readonly PublicModification[]) {
  return modifications
    .map((mod) => ({
      id: mod.id,
      label: mod.label,
      category: mod.category,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function profilePayload(profile: BuildDnaProfileContext) {
  return {
    make: profile.make,
    model: profile.model,
    year: profile.year,
    engine: profile.engine,
    powerPs: profile.powerPs,
    powerKw: profile.powerKw,
    torqueNm: profile.torqueNm,
    fuelType: profile.fuelType,
    transmission: profile.transmission,
    drivetrain: profile.drivetrain,
    notes: profile.notes,
    specificationsText: profile.specificationsText,
    buildPersonalityLabels: [...profile.buildPersonalityLabels].sort(),
  };
}

/** Stable hash of public mods + owner specs — drives cache invalidation. */
export function buildShowcaseBuildDnaFingerprint(
  modifications: readonly PublicModification[],
  profile: BuildDnaProfileContext,
): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        mods: modsPayload(modifications),
        profile: profilePayload(profile),
      }),
    )
    .digest("hex");
  return `${FINGERPRINT_PREFIX}${digest}`;
}

/** @deprecated Use buildShowcaseBuildDnaFingerprint with profile context. */
export function buildShowcaseModsFingerprint(
  modifications: readonly PublicModification[],
): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(modsPayload(modifications)))
    .digest("hex");
  return `${FINGERPRINT_PREFIX}${digest}`;
}
