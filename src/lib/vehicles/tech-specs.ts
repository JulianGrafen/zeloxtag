import { parseInstagramHandle } from "@/lib/vehicles/instagram-handle";

/** Allowed Kraftstoff values for Technische Daten. */
export const VEHICLE_FUEL_TYPES = [
  "Benzin",
  "Diesel",
  "Elektro",
  "LPG",
] as const;

export type VehicleFuelType = (typeof VEHICLE_FUEL_TYPES)[number];

const FUEL_TYPE_ALIASES: Record<string, VehicleFuelType> = {
  benzin: "Benzin",
  petrol: "Benzin",
  gasoline: "Benzin",
  diesel: "Diesel",
  elektro: "Elektro",
  electric: "Elektro",
  ev: "Elektro",
  lpg: "LPG",
  autogas: "LPG",
};

export function isVehicleFuelType(value: string): value is VehicleFuelType {
  return (VEHICLE_FUEL_TYPES as readonly string[]).includes(value);
}

/** Map stored / legacy strings to a known fuel type when possible. */
export function normalizeVehicleFuelType(
  value: string | null | undefined,
): VehicleFuelType | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isVehicleFuelType(trimmed)) return trimmed;
  const alias = FUEL_TYPE_ALIASES[trimmed.toLowerCase()];
  return alias ?? null;
}

/** Allowed Antrieb values for Technische Daten. */
export const VEHICLE_DRIVETRAIN_TYPES = [
  "Allradantrieb",
  "Heckantrieb",
  "Frontantrieb",
] as const;

export type VehicleDrivetrainType = (typeof VEHICLE_DRIVETRAIN_TYPES)[number];

const DRIVETRAIN_ALIASES: Record<string, VehicleDrivetrainType> = {
  allrad: "Allradantrieb",
  allradantrieb: "Allradantrieb",
  "4x4": "Allradantrieb",
  "4wd": "Allradantrieb",
  awd: "Allradantrieb",
  xdrive: "Allradantrieb",
  quattro: "Allradantrieb",
  "4matic": "Allradantrieb",
  heck: "Heckantrieb",
  heckantrieb: "Heckantrieb",
  rwd: "Heckantrieb",
  hinterradantrieb: "Heckantrieb",
  front: "Frontantrieb",
  frontantrieb: "Frontantrieb",
  fwd: "Frontantrieb",
  vorderradantrieb: "Frontantrieb",
};

export function isVehicleDrivetrainType(
  value: string,
): value is VehicleDrivetrainType {
  return (VEHICLE_DRIVETRAIN_TYPES as readonly string[]).includes(value);
}

/** Map stored / legacy strings to a known drivetrain when possible. */
export function normalizeVehicleDrivetrain(
  value: string | null | undefined,
): VehicleDrivetrainType | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isVehicleDrivetrainType(trimmed)) return trimmed;
  const alias = DRIVETRAIN_ALIASES[trimmed.toLowerCase()];
  return alias ?? null;
}

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
  /** Public Instagram handle without @ — never a free-form URL. */
  instagramHandle: string | null;
  /** Relative `{vehicleId}/dyno-chart.ext` path, or a view/proxy URL. */
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
  instagramHandle: null,
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
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return { ...EMPTY_VEHICLE_TECH_SPECS };
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_VEHICLE_TECH_SPECS };
  }
  const record = value as Record<string, unknown>;
  return {
    engine: asTrimmedString(record.engine),
    powerPs: asPositiveInt(record.powerPs),
    powerKw: asPositiveInt(record.powerKw),
    torqueNm: asPositiveInt(record.torqueNm),
    displacementCc: asPositiveInt(record.displacementCc),
    fuelType: normalizeVehicleFuelType(asTrimmedString(record.fuelType)) ??
      asTrimmedString(record.fuelType),
    transmission: asTrimmedString(record.transmission),
    drivetrain:
      normalizeVehicleDrivetrain(asTrimmedString(record.drivetrain)) ??
      asTrimmedString(record.drivetrain),
    color: asTrimmedString(record.color),
    bodyType: asTrimmedString(record.bodyType),
    notes: asTrimmedString(record.notes),
    instagramHandle: parseInstagramHandle(
      record.instagramHandle ?? record.instagram,
    ),
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
  const instagramHandle = parseInstagramHandle(specs.instagramHandle);
  if (instagramHandle) out.instagramHandle = instagramHandle;
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
