import { formatCompactGermanDate } from "@/lib/documents/format";
import type { VehicleOperatingCost } from "@/types/database";

import { computeFuelConsumptionStats } from "./fuel-consumption";
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

export function buildOperatingCostSummary(
  entries: VehicleOperatingCost[],
  referenceDate = new Date(),
): OperatingCostSummary {
  const sorted = sortByDateDesc(entries);
  const { totalMonthlyAverage, categoryMonthlyAverages, windowMonths } =
    computeMonthlyAverages(entries, referenceDate);

  const fuelEntries = sorted.filter((entry) => entry.category === "fuel");
  const fuelConsumption = computeFuelConsumptionStats(fuelEntries);

  return {
    totalMonthlyAverage,
    categoryMonthlyAverages,
    recentEntries: sorted.slice(0, 12),
    fuelStats: {
      lastFill: fuelEntries[0] ?? null,
      monthlyFuelAverage: categoryMonthlyAverages.fuel,
      litersPer100Km: fuelConsumption.latestLitersPer100Km,
      averageLitersPer100Km: fuelConsumption.averageLitersPer100Km,
      eurosPer100Km: fuelConsumption.latestEurosPer100Km,
      consumptionSegmentCount: fuelConsumption.segmentCount,
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
