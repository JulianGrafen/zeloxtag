import type {
  OperatingCostBillingPeriod,
  OperatingCostCategory,
  VehicleOperatingCost,
} from "@/types/database";

import type { OperatingCostChartData } from "./chart-data";

export type { OperatingCostBillingPeriod, OperatingCostCategory, VehicleOperatingCost };

export const OPERATING_COST_CATEGORIES: OperatingCostCategory[] = [
  "fuel",
  "insurance",
  "tax",
  "other",
];

export const OPERATING_COST_CATEGORY_LABELS: Record<OperatingCostCategory, string> = {
  fuel: "Tanken",
  insurance: "Versicherung",
  tax: "Steuer & Gebühren",
  other: "Sonstiges",
};

export const BILLING_PERIOD_LABELS: Record<OperatingCostBillingPeriod, string> = {
  once: "Einmalig",
  monthly: "Monatlich",
  yearly: "Jährlich",
};

export type OperatingCostFormInput = {
  category: OperatingCostCategory;
  amountEur: string;
  occurredOn: string;
  billingPeriod: OperatingCostBillingPeriod;
  note?: string;
  fuelLiters?: string;
  odometerKm?: string;
};

export type OperatingCostSummary = {
  totalMonthlyAverage: number;
  categoryMonthlyAverages: Record<OperatingCostCategory, number>;
  chart: OperatingCostChartData;
  recentEntries: VehicleOperatingCost[];
  fuelStats: {
    lastFill: VehicleOperatingCost | null;
    monthlyFuelAverage: number;
    litersPer100Km: number | null;
    averageLitersPer100Km: number | null;
    eurosPer100Km: number | null;
    consumptionSegmentCount: number;
  };
  windowMonths: number;
  entryCount: number;
};

export type OperatingCostDashboardHint = {
  totalMonthlyAverage: number | null;
  lastFuelDateLabel: string | null;
  fuelEntryCount: number;
};
