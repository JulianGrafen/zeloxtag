import type { VehicleOperatingCost } from "@/types/database";

import {
  buildCategoryMonthBuckets,
  listRollingWindowMonthKeys,
  rollingMonthWindowEnd,
  rollingMonthWindowStart,
  sumMonthBuckets,
} from "./monthly-average";
import type { OperatingCostCategory } from "./types";
import { OPERATING_COST_CATEGORIES } from "./types";

const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
] as const;

export type OperatingCostMonthStack = {
  monthKey: string;
  label: string;
  byCategory: Record<OperatingCostCategory, number>;
  total: number;
};

export type OperatingCostCategorySlice = {
  category: OperatingCostCategory;
  amount: number;
  share: number;
};

export type OperatingCostChartData = {
  months: OperatingCostMonthStack[];
  categoryTotals: Record<OperatingCostCategory, number>;
  categorySlices: OperatingCostCategorySlice[];
  grandTotal: number;
  maxMonthTotal: number;
  windowMonths: number;
};

function monthLabelShort(monthKey: string): string {
  const month = Number.parseInt(monthKey.split("-")[1] ?? "1", 10);
  const index = Math.min(Math.max(month - 1, 0), 11);
  return MONTH_LABELS_SHORT[index];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildOperatingCostChartData(
  entries: VehicleOperatingCost[],
  referenceDate = new Date(),
): OperatingCostChartData {
  const windowEnd = rollingMonthWindowEnd(referenceDate);
  const windowStart = rollingMonthWindowStart(windowEnd);
  const monthKeys = listRollingWindowMonthKeys(referenceDate);
  const categoryBuckets = buildCategoryMonthBuckets(entries, windowStart, windowEnd);

  const categoryTotals = Object.fromEntries(
    OPERATING_COST_CATEGORIES.map((category) => [
      category,
      roundMoney(sumMonthBuckets(categoryBuckets[category])),
    ]),
  ) as Record<OperatingCostCategory, number>;

  const months: OperatingCostMonthStack[] = monthKeys.map((monthKey) => {
    const byCategory = Object.fromEntries(
      OPERATING_COST_CATEGORIES.map((category) => [
        category,
        roundMoney(categoryBuckets[category].get(monthKey) ?? 0),
      ]),
    ) as Record<OperatingCostCategory, number>;

    const total = roundMoney(
      OPERATING_COST_CATEGORIES.reduce((sum, category) => sum + byCategory[category], 0),
    );

    return {
      monthKey,
      label: monthLabelShort(monthKey),
      byCategory,
      total,
    };
  });

  const grandTotal = roundMoney(
    OPERATING_COST_CATEGORIES.reduce((sum, category) => sum + categoryTotals[category], 0),
  );

  const categorySlices: OperatingCostCategorySlice[] = OPERATING_COST_CATEGORIES
    .map((category) => ({
      category,
      amount: categoryTotals[category],
      share: grandTotal > 0 ? categoryTotals[category] / grandTotal : 0,
    }))
    .filter((slice) => slice.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const maxMonthTotal = months.reduce((max, month) => Math.max(max, month.total), 0);

  return {
    months,
    categoryTotals,
    categorySlices,
    grandTotal,
    maxMonthTotal,
    windowMonths: monthKeys.length,
  };
}
