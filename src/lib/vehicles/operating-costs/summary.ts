import { formatCompactGermanDate } from "@/lib/documents/format";
import type { VehicleOperatingCost } from "@/types/database";

import { computeMonthlyAverages } from "./monthly-average";
import type {
  OperatingCostCategory,
  OperatingCostDashboardHint,
  OperatingCostSummary,
} from "./types";

function sortByDateDesc(
  entries: VehicleOperatingCost[],
): VehicleOperatingCost[] {
  return [...entries].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
}

function computeFuelEurosPer100Km(
  fuelEntries: VehicleOperatingCost[],
): number | null {
  const withKm = sortByDateDesc(fuelEntries).filter(
    (entry) =>
      entry.odometer_km != null &&
      entry.fuel_liters != null &&
      entry.fuel_liters > 0,
  );

  if (withKm.length < 2) return null;

  const newest = withKm[0]!;
  const previous = withKm[1]!;
  const kmDelta = newest.odometer_km! - previous.odometer_km!;
  if (kmDelta <= 0) return null;

  const liters = newest.fuel_liters!;
  const cost = Number(newest.amount_eur);
  if (!Number.isFinite(cost) || cost <= 0) return null;

  const per100 = (cost / kmDelta) * 100;
  return Math.round(per100 * 100) / 100;
}

export function buildOperatingCostSummary(
  entries: VehicleOperatingCost[],
  referenceDate = new Date(),
): OperatingCostSummary {
  const sorted = sortByDateDesc(entries);
  const { totalMonthlyAverage, categoryMonthlyAverages, windowMonths } =
    computeMonthlyAverages(entries, referenceDate);

  const fuelEntries = sorted.filter((entry) => entry.category === "fuel");

  return {
    totalMonthlyAverage,
    categoryMonthlyAverages,
    recentEntries: sorted.slice(0, 12),
    fuelStats: {
      lastFill: fuelEntries[0] ?? null,
      monthlyFuelAverage: categoryMonthlyAverages.fuel,
      eurosPer100Km: computeFuelEurosPer100Km(fuelEntries),
    },
    windowMonths,
    entryCount: entries.length,
  };
}

export function buildOperatingCostDashboardHint(
  entries: VehicleOperatingCost[],
): OperatingCostDashboardHint {
  if (entries.length === 0) {
    return {
      totalMonthlyAverage: null,
      lastFuelDateLabel: null,
      fuelEntryCount: 0,
    };
  }

  const summary = buildOperatingCostSummary(entries);
  const lastFuel = summary.fuelStats.lastFill;

  return {
    totalMonthlyAverage: summary.totalMonthlyAverage,
    lastFuelDateLabel: lastFuel
      ? formatCompactGermanDate(lastFuel.occurred_on)
      : null,
    fuelEntryCount: entries.filter((entry) => entry.category === "fuel").length,
  };
}

export function formatMonthlyAverageLabel(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return "Noch keine Kosten";
  }
  return `ø ${value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })}/Monat`;
}

export function categoryLabel(category: OperatingCostCategory): string {
  const labels: Record<OperatingCostCategory, string> = {
    fuel: "Tanken",
    insurance: "Versicherung",
    tax: "Steuer & Gebühren",
    other: "Sonstiges",
  };
  return labels[category];
}
