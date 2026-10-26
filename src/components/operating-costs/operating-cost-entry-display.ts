import { formatLitersPer100Km } from "@/lib/vehicles/operating-costs/fuel-consumption";
import {
  BILLING_PERIOD_LABELS,
  OPERATING_COST_CATEGORY_LABELS,
} from "@/lib/vehicles/operating-costs/types";
import type { VehicleOperatingCost } from "@/types/database";
import { formatDateDE, formatMileageKm } from "@/utils/formatters";

const DE_LOCALE = "de-DE";
const META_SEPARATOR = " · ";

const LITERS_FORMATTER = new Intl.NumberFormat(DE_LOCALE, {
  maximumFractionDigits: 2,
});

/** Fuel prices are quoted with three decimals at German pumps (e.g. 1,799 €). */
const PRICE_PER_LITER_FORMATTER = new Intl.NumberFormat(DE_LOCALE, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export type OperatingCostEntryDisplay = {
  title: string;
  meta: string;
};

/** 42.5 → "42,5 L". Null when missing or not positive. */
export function formatFuelLiters(liters: number | null | undefined): string | null {
  if (liters == null || !Number.isFinite(liters) || liters <= 0) return null;
  return `${LITERS_FORMATTER.format(liters)} L`;
}

/** 80.33 € / 44.65 L → "1,799 €/L". Null when either side is unusable. */
export function formatPricePerLiter(
  amountEur: number | null | undefined,
  liters: number | null | undefined,
): string | null {
  if (amountEur == null || liters == null) return null;
  if (!Number.isFinite(amountEur) || !Number.isFinite(liters) || liters <= 0) {
    return null;
  }
  return `${PRICE_PER_LITER_FORMATTER.format(amountEur / liters)}/L`;
}

function joinMeta(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(META_SEPARATOR);
}

function fuelMetaParts(
  entry: VehicleOperatingCost,
  litersPer100Km: number | null,
): Array<string | null> {
  return [
    formatFuelLiters(entry.fuel_liters),
    formatMileageKm(entry.odometer_km),
    formatPricePerLiter(Number(entry.amount_eur), entry.fuel_liters),
    litersPer100Km != null ? formatLitersPer100Km(litersPer100Km) : null,
  ];
}

/**
 * Row copy for a cost entry. The free-text note (e.g. the station) becomes the
 * title when present; the date then moves into the meta line.
 */
export function describeOperatingCostEntry(
  entry: VehicleOperatingCost,
  litersPer100Km: number | null = null,
): OperatingCostEntryDisplay {
  const date = formatDateDE(entry.occurred_on) ?? "Ohne Datum";
  const note = entry.note?.trim() || null;
  const isFuel = entry.category === "fuel";
  const categoryLabel = OPERATING_COST_CATEGORY_LABELS[entry.category];

  if (isFuel) {
    return {
      title: note ?? date,
      meta: joinMeta([note ? date : null, ...fuelMetaParts(entry, litersPer100Km)]),
    };
  }

  const billingLabel =
    entry.billing_period === "once" ? null : BILLING_PERIOD_LABELS[entry.billing_period];
  return {
    title: note ?? categoryLabel,
    meta: joinMeta([date, note ? categoryLabel : null, billingLabel]),
  };
}
