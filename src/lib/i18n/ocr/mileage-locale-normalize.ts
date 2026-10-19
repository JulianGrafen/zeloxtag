import type { AppLocale } from "@/lib/i18n/types";
import { milesToKilometers } from "@/lib/i18n/units-convert";

/**
 * When EN prompts fail, very low "mileageKm" values may still be unc converted miles.
 * Only auto-fix clearly low odometer readings (≤999 mi).
 */
export function normalizeInvoiceMileageKmForLocale(
  km: number | null,
  locale: AppLocale,
): number | null {
  if (km == null || locale !== "en") {
    return km;
  }
  if (km > 0 && km <= 999) {
    return Math.round(milesToKilometers(km));
  }
  return km;
}
