import "server-only";

import { buildShowcaseModsFingerprint } from "@/lib/showcase/build-dna-fingerprint";
import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";
import { generateShowcaseBuildDna } from "@/services/showcase/BuildDnaService";
import { isMissingVehicleBuildDnaColumnError } from "@/lib/vehicles/load-vehicle-projection";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Vehicle } from "@/types/database";

export type RefreshShowcaseBuildDnaResult =
  | {
      status: "skipped";
      reason: "unchanged" | "insufficient_mods" | "schema_not_migrated";
    }
  | { status: "updated"; dna: ShowcaseBuildDna };

function isBuildDnaSchemaMissing(error: { message?: string }): boolean {
  return isMissingVehicleBuildDnaColumnError(error);
}

export async function refreshShowcaseBuildDna(
  vehicle: Vehicle,
  modifications: readonly PublicModification[],
): Promise<RefreshShowcaseBuildDnaResult> {
  if (modifications.length < 2) {
    const admin = createAdminClient();
    const { error: clearError } = await admin
      .from("vehicles")
      .update({
        showcase_build_dna: null,
        showcase_build_dna_fingerprint: null,
        showcase_build_dna_updated_at: null,
      })
      .eq("id", vehicle.id);

    if (clearError && isBuildDnaSchemaMissing(clearError)) {
      return { status: "skipped", reason: "schema_not_migrated" };
    }
    if (clearError) {
      throw new Error(clearError.message);
    }

    return { status: "skipped", reason: "insufficient_mods" };
  }

  const fingerprint = buildShowcaseModsFingerprint(modifications);
  if (
    vehicle.showcase_build_dna_fingerprint === fingerprint &&
    vehicle.showcase_build_dna
  ) {
    return { status: "skipped", reason: "unchanged" };
  }

  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const dna = await generateShowcaseBuildDna(modifications, {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    powerPs: specs.powerPs,
    notes: specs.notes?.trim() ? specs.notes.trim() : null,
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicles")
    .update({
      showcase_build_dna: dna,
      showcase_build_dna_fingerprint: fingerprint,
      showcase_build_dna_updated_at: new Date().toISOString(),
    })
    .eq("id", vehicle.id);

  if (error) {
    if (isBuildDnaSchemaMissing(error)) {
      console.warn(
        "[refreshShowcaseBuildDna] showcase_build_dna columns missing — apply migration 00063_vehicle_showcase_build_dna.sql",
      );
      return { status: "skipped", reason: "schema_not_migrated" };
    }
    throw new Error(error.message);
  }

  return { status: "updated", dna };
}
