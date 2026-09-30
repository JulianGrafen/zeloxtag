import "server-only";

import { buildShowcaseBuildDnaFingerprint } from "@/lib/showcase/build-dna-fingerprint";
import { buildBuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import { isBuildDnaEligible } from "@/lib/showcase/build-dna-eligibility";
import {
  parseShowcaseBuildDna,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import { generateShowcaseBuildDna } from "@/services/showcase/BuildDnaService";
import { isMissingVehicleBuildDnaColumnError } from "@/lib/vehicles/load-vehicle-projection";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import type { Document, Vehicle } from "@/types/database";

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
  const profile = buildBuildDnaProfileContext(vehicle);

  if (!isBuildDnaEligible(modifications.length, profile)) {
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
  const fingerprint = buildShowcaseBuildDnaFingerprint(modifications, profile);
  const cachedDna = parseShowcaseBuildDna(vehicle.showcase_build_dna);
  if (
    vehicle.showcase_build_dna_fingerprint === fingerprint &&
    cachedDna
  ) {
    return { status: "skipped", reason: "unchanged" };
  }

  const dna = await generateShowcaseBuildDna(modifications, profile);

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

/** Recompute DNA after tech specs / notes change (best-effort). */
export async function tryRefreshShowcaseBuildDnaForVehicle(
  vehicleId: string,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  const admin = createAdminClient();
  const { data: vehicle, error: vehicleError } = await admin
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError || !vehicle) return;

  const { data: documents, error: docsError } = await admin
    .from("documents")
    .select("*")
    .eq("vehicle_id", vehicleId);

  if (docsError) return;

  const { modifications } = buildPublicShowcasePayload(
    vehicle as Vehicle,
    (documents ?? []) as Document[],
  );

  try {
    await refreshShowcaseBuildDna(vehicle as Vehicle, modifications);
  } catch (error) {
    console.warn("[tryRefreshShowcaseBuildDnaForVehicle] refresh failed", error);
  }
}
