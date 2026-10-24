export const VEHICLE_MODEL_YEAR_MIN = 1900;
export const VEHICLE_MODEL_YEAR_MAX_OFFSET = 1;

export function getVehicleModelYearMax(
  now = new Date(),
): number {
  return now.getFullYear() + VEHICLE_MODEL_YEAR_MAX_OFFSET;
}

/** Newest first — matches iOS-style model-year wheels. */
export function buildVehicleModelYears(
  now = new Date(),
): readonly number[] {
  const max = getVehicleModelYearMax(now);
  const years: number[] = [];
  for (let year = max; year >= VEHICLE_MODEL_YEAR_MIN; year -= 1) {
    years.push(year);
  }
  return years;
}

export function suggestDefaultVehicleModelYear(now = new Date()): number {
  const current = now.getFullYear();
  return Math.min(getVehicleModelYearMax(now), Math.max(VEHICLE_MODEL_YEAR_MIN, current - 8));
}

export function isValidVehicleModelYear(year: number): boolean {
  return (
    Number.isFinite(year) &&
    year >= VEHICLE_MODEL_YEAR_MIN &&
    year <= getVehicleModelYearMax()
  );
}

export function validateVehicleModelYearInput(
  raw: string,
): string | null {
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!isValidVehicleModelYear(parsed)) {
    return "Baujahr muss zwischen 1900 und 2100 liegen.";
  }
  return null;
}
