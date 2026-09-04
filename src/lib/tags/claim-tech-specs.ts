import {
  EMPTY_VEHICLE_TECH_SPECS,
  normalizeVehicleDrivetrain,
  normalizeVehicleFuelType,
  type VehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";

/** Optional tech fields collected during tag claim. */
export type ClaimTechSpecs = {
  powerPs: number | null;
  displacementCc: number | null;
  drivetrain: string | null;
  fuelType: string | null;
};

export type ClaimTechSpecsInput = {
  powerPs?: string | number | null;
  displacementCc?: string | number | null;
  drivetrain?: string | null;
  fuelType?: string | null;
};

function parsePositiveInt(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded > 0 ? rounded : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function normalizeClaimTechSpecs(
  input?: ClaimTechSpecsInput | null,
): ClaimTechSpecs | null {
  if (!input) return null;

  const powerPs = parsePositiveInt(input.powerPs);
  const displacementCc = parsePositiveInt(input.displacementCc);
  const drivetrain =
    normalizeVehicleDrivetrain(input.drivetrain?.trim() || null) ??
    (input.drivetrain?.trim() || null);
  const fuelType =
    normalizeVehicleFuelType(input.fuelType?.trim() || null) ??
    (input.fuelType?.trim() || null);

  if (
    powerPs == null &&
    displacementCc == null &&
    !drivetrain &&
    !fuelType
  ) {
    return null;
  }

  return {
    powerPs,
    displacementCc,
    drivetrain,
    fuelType,
  };
}

export function claimTechSpecsToVehicleSpecs(
  specs: ClaimTechSpecs | null | undefined,
): Partial<VehicleTechSpecs> | null {
  if (!specs) return null;

  const partial: Partial<VehicleTechSpecs> = {};
  if (specs.powerPs != null) partial.powerPs = specs.powerPs;
  if (specs.displacementCc != null) partial.displacementCc = specs.displacementCc;
  if (specs.drivetrain) partial.drivetrain = specs.drivetrain;
  if (specs.fuelType) partial.fuelType = specs.fuelType;

  return Object.keys(partial).length > 0 ? partial : null;
}

export function hasClaimTechSpecs(specs: ClaimTechSpecs | null | undefined): boolean {
  return claimTechSpecsToVehicleSpecs(specs) != null;
}

export function mergeClaimTechSpecs(
  specs: ClaimTechSpecs | null | undefined,
): VehicleTechSpecs {
  const base = { ...EMPTY_VEHICLE_TECH_SPECS };
  const partial = claimTechSpecsToVehicleSpecs(specs);
  if (!partial) return base;
  return { ...base, ...partial };
}
