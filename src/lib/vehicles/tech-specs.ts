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

/** Default oil-change interval bounds for tech_specs validation. */
export const OIL_CHANGE_INTERVAL_KM_MIN = 1_000;
export const OIL_CHANGE_INTERVAL_KM_MAX = 50_000;
export const OIL_CHANGE_INTERVAL_KM_STEP = 2_500;
export const OIL_CHANGE_INTERVAL_MONTHS_MIN = 1;
export const OIL_CHANGE_INTERVAL_MONTHS_MAX = 36;

/** Dropdown options for oil-change interval (km), 2.500 km steps. */
export const OIL_CHANGE_INTERVAL_KM_OPTIONS: readonly number[] = Array.from(
  {
    length:
      (OIL_CHANGE_INTERVAL_KM_MAX - OIL_CHANGE_INTERVAL_KM_STEP) /
        OIL_CHANGE_INTERVAL_KM_STEP +
      1,
  },
  (_, index) => OIL_CHANGE_INTERVAL_KM_STEP + index * OIL_CHANGE_INTERVAL_KM_STEP,
);

export function isOilChangeIntervalKmOption(km: number): boolean {
  return (
    km >= OIL_CHANGE_INTERVAL_KM_STEP &&
    km <= OIL_CHANGE_INTERVAL_KM_MAX &&
    km % OIL_CHANGE_INTERVAL_KM_STEP === 0
  );
}

/** Parse claim / form input to a valid oil-change km option (2.500 km steps). */
export function parseOilChangeIntervalKm(value: unknown): number | null {
  const parsed = asPositiveInt(value);
  if (parsed == null) return null;
  return isOilChangeIntervalKmOption(parsed) ? parsed : null;
}

/** Dropdown options for oil-change interval (months), 1-month steps. */
export const OIL_CHANGE_INTERVAL_MONTHS_OPTIONS: readonly number[] = Array.from(
  {
    length:
      OIL_CHANGE_INTERVAL_MONTHS_MAX - OIL_CHANGE_INTERVAL_MONTHS_MIN + 1,
  },
  (_, index) => OIL_CHANGE_INTERVAL_MONTHS_MIN + index,
);

export function isOilChangeIntervalMonthsOption(months: number): boolean {
  return (
    months >= OIL_CHANGE_INTERVAL_MONTHS_MIN &&
    months <= OIL_CHANGE_INTERVAL_MONTHS_MAX &&
    Number.isInteger(months)
  );
}

export function formatOilChangeIntervalMonthsLabel(months: number): string {
  return months === 1 ? "1 Monat" : `${months} Monate`;
}

export function parseOilChangeIntervalMonths(value: unknown): number | null {
  const parsed = asPositiveInt(value);
  if (parsed == null) return null;
  return isOilChangeIntervalMonthsOption(parsed) ? parsed : null;
}

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
  /** Custom oil-change interval in km (default 10_000 when null). */
  oilChangeIntervalKm: number | null;
  /** Custom oil-change interval in months (default 12 when null). */
  oilChangeIntervalMonths: number | null;
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
  oilChangeIntervalKm: null,
  oilChangeIntervalMonths: null,
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

function asBoundedInt(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const parsed = asPositiveInt(value);
  if (parsed == null) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
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
    oilChangeIntervalKm: parseOilChangeIntervalKm(record.oilChangeIntervalKm),
    oilChangeIntervalMonths: parseOilChangeIntervalMonths(
      record.oilChangeIntervalMonths,
    ),
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
  if (specs.oilChangeIntervalKm != null) {
    out.oilChangeIntervalKm = specs.oilChangeIntervalKm;
  }
  if (specs.oilChangeIntervalMonths != null) {
    out.oilChangeIntervalMonths = specs.oilChangeIntervalMonths;
  }
  return out;
}

export function countFilledTechSpecs(specs: VehicleTechSpecs): number {
  return Object.values(specs).filter((value) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  }).length;
}
