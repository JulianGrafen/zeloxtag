const KM_TO_MI = 0.621371;

/** Display miles from canonical km (internal storage). */
export function kilometersToMiles(km: number): number {
  return km * KM_TO_MI;
}

/** Canonical km from odometer miles (OCR post-parse). */
export function milesToKilometers(miles: number): number {
  return miles * (1 / KM_TO_MI);
}

export function formatMilesFromKm(km: number): string {
  const miles = kilometersToMiles(km);
  return Math.round(miles).toLocaleString("en-US");
}
