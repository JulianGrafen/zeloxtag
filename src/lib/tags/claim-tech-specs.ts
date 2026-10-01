import { DEFAULT_OIL_INTERVAL_MONTHS } from "@/lib/documents/oil-changes";
import { parseBuildPersonalityTags } from "@/lib/vehicles/build-personality-chips";
import {
  ACCEL_0_100_SEC_MAX,
  ACCEL_0_100_SEC_MIN,
  ACCEL_100_200_SEC_MAX,
  ACCEL_100_200_SEC_MIN,
  EMPTY_VEHICLE_TECH_SPECS,
  parseAccelSeconds,
  parseOilChangeIntervalKm,
  parseOilChangeIntervalMonths,
  normalizeVehicleDrivetrain,
  normalizeVehicleFuelType,
  type VehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";

/** Optional tech fields collected during tag claim. */
export type ClaimTechSpecs = {
  powerPs: number | null;
  torqueNm: number | null;
  displacementCc: number | null;
  accel0To100Sec: number | null;
  accel100To200Sec: number | null;
  drivetrain: string | null;
  fuelType: string | null;
  oilChangeIntervalKm: number | null;
  oilChangeIntervalMonths: number | null;
  buildPersonalityTags: ReturnType<typeof parseBuildPersonalityTags>;
};

export type ClaimTechSpecsInput = {
  powerPs?: string | number | null;
  torqueNm?: string | number | null;
  displacementCc?: string | number | null;
  accel0To100Sec?: string | number | null;
  accel100To200Sec?: string | number | null;
  drivetrain?: string | null;
  fuelType?: string | null;
  oilChangeIntervalKm?: string | number | null;
  oilChangeIntervalMonths?: string | number | null;
  buildPersonalityTags?: string[] | null;
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
  const torqueNm = parsePositiveInt(input.torqueNm);
  const displacementCc = parsePositiveInt(input.displacementCc);
  const accel0To100Sec = parseAccelSeconds(
    input.accel0To100Sec,
    ACCEL_0_100_SEC_MIN,
    ACCEL_0_100_SEC_MAX,
  );
  const accel100To200Sec = parseAccelSeconds(
    input.accel100To200Sec,
    ACCEL_100_200_SEC_MIN,
    ACCEL_100_200_SEC_MAX,
  );
  const drivetrain =
    normalizeVehicleDrivetrain(input.drivetrain?.trim() || null) ??
    (input.drivetrain?.trim() || null);
  const fuelType =
    normalizeVehicleFuelType(input.fuelType?.trim() || null) ??
    (input.fuelType?.trim() || null);
  const oilChangeIntervalKm = parseOilChangeIntervalKm(input.oilChangeIntervalKm);
  const oilChangeIntervalMonths =
    parseOilChangeIntervalMonths(input.oilChangeIntervalMonths) ??
    (oilChangeIntervalKm != null ? DEFAULT_OIL_INTERVAL_MONTHS : null);
  const buildPersonalityTags = parseBuildPersonalityTags(
    input.buildPersonalityTags,
  );

  if (
    powerPs == null &&
    torqueNm == null &&
    displacementCc == null &&
    accel0To100Sec == null &&
    accel100To200Sec == null &&
    !drivetrain &&
    !fuelType &&
    oilChangeIntervalKm == null &&
    buildPersonalityTags.length === 0
  ) {
    return null;
  }

  return {
    powerPs,
    torqueNm,
    displacementCc,
    accel0To100Sec,
    accel100To200Sec,
    drivetrain,
    fuelType,
    oilChangeIntervalKm,
    oilChangeIntervalMonths,
    buildPersonalityTags,
  };
}

export function claimTechSpecsToVehicleSpecs(
  specs: ClaimTechSpecs | null | undefined,
): Partial<VehicleTechSpecs> | null {
  if (!specs) return null;

  const partial: Partial<VehicleTechSpecs> = {};
  if (specs.powerPs != null) partial.powerPs = specs.powerPs;
  if (specs.torqueNm != null) partial.torqueNm = specs.torqueNm;
  if (specs.displacementCc != null) partial.displacementCc = specs.displacementCc;
  if (specs.accel0To100Sec != null) {
    partial.accel0To100Sec = specs.accel0To100Sec;
  }
  if (specs.accel100To200Sec != null) {
    partial.accel100To200Sec = specs.accel100To200Sec;
  }
  if (specs.drivetrain) partial.drivetrain = specs.drivetrain;
  if (specs.fuelType) partial.fuelType = specs.fuelType;
  if (specs.oilChangeIntervalKm != null) {
    partial.oilChangeIntervalKm = specs.oilChangeIntervalKm;
  }
  if (specs.oilChangeIntervalMonths != null) {
    partial.oilChangeIntervalMonths = specs.oilChangeIntervalMonths;
  }
  if (specs.buildPersonalityTags.length > 0) {
    partial.buildPersonalityTags = specs.buildPersonalityTags;
  }

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
