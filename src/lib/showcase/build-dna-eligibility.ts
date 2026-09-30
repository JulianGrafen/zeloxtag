import type { BuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";

/** Freeform showcase specification text (tech_specs.notes). */
export function hasOwnerShowcaseSpecificationText(
  notes: string | null | undefined,
): boolean {
  return Boolean(notes?.trim());
}

type BuildDnaEligibilityProfile = Pick<
  BuildDnaProfileContext,
  "notes" | "buildPersonalityLabels"
>;

/**
 * When to show / compute Build DNA on public showcase and Story-Pass.
 * Umbauten (≥2) or owner-written specification text in the showcase.
 */
export function isBuildDnaEligible(
  publicModificationCount: number,
  profile: BuildDnaEligibilityProfile,
): boolean {
  if (publicModificationCount >= 2) {
    return true;
  }
  if (hasOwnerShowcaseSpecificationText(profile.notes)) {
    return true;
  }
  if (profile.buildPersonalityLabels.length > 0) {
    return true;
  }
  return false;
}
