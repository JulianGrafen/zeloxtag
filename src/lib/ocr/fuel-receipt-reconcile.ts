/**
 * Post-OCR sanity checks for fuel receipts (German stations).
 * Common model mistake: returning €/L (e.g. 1.89) as `liters` instead of volume (e.g. 42.5 L).
 */

const MIN_FILL_LITERS = 3;
const MAX_FILL_LITERS = 200;
const MIN_PRICE_PER_LITER_EUR = 0.9;
const MAX_PRICE_PER_LITER_EUR = 3.5;

export function reconcileFuelLiters(input: {
  liters: number | null;
  totalAmount: number | null;
  pricePerLiter: number | null;
}): number | null {
  const total = input.totalAmount;
  const pricePerLiter = normalizePricePerLiter(input.pricePerLiter);
  const fromOcr = normalizeVolumeLiters(input.liters);

  const derivedFromTotal =
    total != null && total > 0 && pricePerLiter != null
      ? Math.round((total / pricePerLiter) * 100) / 100
      : null;

  if (derivedFromTotal != null) {
    if (fromOcr == null) {
      return clampFillLiters(derivedFromTotal);
    }

    if (looksLikeLiterPriceNotVolume(fromOcr, total)) {
      return clampFillLiters(derivedFromTotal);
    }

    const relativeError =
      Math.abs(derivedFromTotal - fromOcr) / Math.max(fromOcr, 0.01);
    if (relativeError > 0.04) {
      return clampFillLiters(derivedFromTotal);
    }
  }

  return fromOcr != null ? clampFillLiters(fromOcr) : null;
}

export function normalizePricePerLiter(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  if (value < MIN_PRICE_PER_LITER_EUR || value > MAX_PRICE_PER_LITER_EUR) {
    return null;
  }
  return Math.round(value * 1000) / 1000;
}

function normalizeVolumeLiters(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 1000) / 1000;
}

function clampFillLiters(value: number): number | null {
  if (value < MIN_FILL_LITERS || value > MAX_FILL_LITERS) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

/** Volume under ~6 L with a typical fill total is usually €/L misread as liters. */
export function looksLikeLiterPriceNotVolume(
  liters: number,
  totalAmount: number | null,
): boolean {
  if (liters >= 6) return false;
  if (liters >= MIN_PRICE_PER_LITER_EUR && liters <= MAX_PRICE_PER_LITER_EUR) {
    return totalAmount != null && totalAmount >= 15;
  }
  return false;
}
