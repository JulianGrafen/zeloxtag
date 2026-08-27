const VIN_CHARS = /^[A-HJ-NPR-Z0-9]{17}$/;

const VIN_VALUES: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeVin(vin: string): string {
  return vin.replace(/\s+/g, "").toUpperCase();
}

/** ISO 3779 check digit — filters OCR garbage VINs. */
export function isPlausibleVin(vin: string): boolean {
  const normalized = normalizeVin(vin);
  if (!VIN_CHARS.test(normalized)) return false;
  // Real FINs mix letters and digits; pure 17-letter OCR tokens are not VINs.
  if (!/\d/.test(normalized) || !/[A-Z]/.test(normalized)) return false;
  if (!/[A-Z]/.test(normalized.slice(0, 3))) return false;
  if (/^(.)\1+$/.test(normalized)) return false;

  let sum = 0;
  for (let index = 0; index < 17; index += 1) {
    const value = VIN_VALUES[normalized[index]!];
    if (value === undefined) return false;
    sum += value * VIN_WEIGHTS[index]!;
  }

  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  return normalized[8] === expected;
}

export function extractPlausibleVin(rawText: string): string | null {
  const pattern = /\b([A-HJ-NPR-Z0-9]{17})\b/gi;
  for (const match of rawText.matchAll(pattern)) {
    const candidate = normalizeVin(match[1] ?? "");
    if (isPlausibleVin(candidate)) {
      return candidate;
    }
  }
  return null;
}
