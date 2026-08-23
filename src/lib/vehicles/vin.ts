/** ISO 3779 — 17 chars, no I/O/Q. */
const VIN_BODY = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/\s+/g, "").toUpperCase();
  if (cleaned.length < 5) return null;
  return cleaned.slice(0, 17);
}

/**
 * Rejects placeholder / test VINs (wrong length, illegal chars, obvious junk).
 */
export function isPlausibleVin(value: string | null | undefined): boolean {
  const vin = normalizeVin(value);
  if (!vin || vin.length !== 17) return false;
  if (!VIN_BODY.test(vin)) return false;
  if (/^(.)\1+$/.test(vin)) return false;
  if (!/[A-Z]/.test(vin) || !/\d/.test(vin)) return false;
  // WMI (positions 1–3) must include at least one letter — rejects numeric junk.
  if (!/[A-Z]/.test(vin.slice(0, 3))) return false;
  return true;
}

export function verifyVinMatch(
  extractedVin: string,
  garageVin: string,
): boolean {
  if (!isPlausibleVin(extractedVin) || !isPlausibleVin(garageVin)) {
    return false;
  }
  return normalizeVin(extractedVin) === normalizeVin(garageVin);
}

/** Persist only ISO-valid VINs; invalid input becomes null (not stored). */
export function normalizeVinForStorage(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  if (!isPlausibleVin(raw)) return null;
  return normalizeVin(raw);
}
