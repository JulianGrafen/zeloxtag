import "server-only";

import { buildShowcaseModsFingerprint } from "@/lib/showcase/build-dna-fingerprint";
import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";
import { generateShowcaseBuildDna } from "@/services/showcase/BuildDnaService";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Vehicle } from "@/types/database";

export type RefreshShowcaseBuildDnaResult =
  | { status: "skipped"; reason: "unchanged" | "insufficient_mods" }
  | { status: "updated"; dna: ShowcaseBuildDna };

export async function refreshShowcaseBuildDna(
  vehicle: Vehicle,
  modifications: readonly PublicModification[],
): Promise<RefreshShowcaseBuildDnaResult> {
  if (modifications.length < 2) {
    const admin = createAdminClient();
    await admin
      .from("vehicles")
      .update({
        showcase_build_dna: null,
        showcase_build_dna_fingerprint: null,
        showcase_build_dna_updated_at: null,
      })
      .eq("id", vehicle.id);

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
    throw new Error(error.message);
  }

  return { status: "updated", dna };
}
