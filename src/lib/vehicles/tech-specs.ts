/**
 * Structured Antrieb / Fahrwerk fields stored on vehicles.tech_specs.
 */

export type VehicleTechSpecs = {
  engine: string | null;
  powerPs: number | null;
  powerKw: number | null;
  torqueNm: number | null;
  displacementCc: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  color: string | null;
  bodyType: string | null;
  notes: string | null;
  /** Supabase Storage URL for dyno / Leistungsdiagramm PDF. */
  dynoChartUrl: string | null;
};

export const EMPTY_VEHICLE_TECH_SPECS: VehicleTechSpecs = {
  engine: null,
  powerPs: null,
  powerKw: null,
  torqueNm: null,
  displacementCc: null,
  fuelType: null,
  transmission: null,
  drivetrain: null,
  color: null,
  bodyType: null,
  notes: null,
  dynoChartUrl: null,
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asPositiveInt(value: unknown): number | null {
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

export function parseVehicleTechSpecs(raw: unknown): VehicleTechSpecs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_VEHICLE_TECH_SPECS };
  }
  const record = raw as Record<string, unknown>;
  return {
    engine: asTrimmedString(record.engine),
    powerPs: asPositiveInt(record.powerPs),
    powerKw: asPositiveInt(record.powerKw),
    torqueNm: asPositiveInt(record.torqueNm),
    displacementCc: asPositiveInt(record.displacementCc),
    fuelType: asTrimmedString(record.fuelType),
    transmission: asTrimmedString(record.transmission),
    drivetrain: asTrimmedString(record.drivetrain),
    color: asTrimmedString(record.color),
    bodyType: asTrimmedString(record.bodyType),
    notes: asTrimmedString(record.notes),
    dynoChartUrl: asTrimmedString(record.dynoChartUrl),
  };
}

/** Drop empty keys for compact JSON storage. */
export function serializeVehicleTechSpecs(
  specs: VehicleTechSpecs,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (specs.engine) out.engine = specs.engine;
  if (specs.powerPs != null) out.powerPs = specs.powerPs;
  if (specs.powerKw != null) out.powerKw = specs.powerKw;
  if (specs.torqueNm != null) out.torqueNm = specs.torqueNm;
  if (specs.displacementCc != null) out.displacementCc = specs.displacementCc;
  if (specs.fuelType) out.fuelType = specs.fuelType;
  if (specs.transmission) out.transmission = specs.transmission;
  if (specs.drivetrain) out.drivetrain = specs.drivetrain;
  if (specs.color) out.color = specs.color;
  if (specs.bodyType) out.bodyType = specs.bodyType;
  if (specs.notes) out.notes = specs.notes;
  if (specs.dynoChartUrl) out.dynoChartUrl = specs.dynoChartUrl;
  return out;
}

export function countFilledTechSpecs(specs: VehicleTechSpecs): number {
  return Object.values(specs).filter((value) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  }).length;
}
