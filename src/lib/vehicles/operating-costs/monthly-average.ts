import type {
  OperatingCostBillingPeriod,
  VehicleOperatingCost,
} from "@/types/database";

import type { OperatingCostCategory } from "./types";
import { OPERATING_COST_CATEGORIES } from "./types";

const WINDOW_MONTHS = 12;

export type MonthBucket = Map<string, number>;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split("-");
  return { year: Number.parseInt(y!, 10), month: Number.parseInt(m!, 10) };
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function compareMonthKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function rollingMonthWindowEnd(reference = new Date()): string {
  const berlin = new Date(
    reference.toLocaleString("en-US", { timeZone: "Europe/Berlin" }),
  );
  return monthKey(berlin.getFullYear(), berlin.getMonth() + 1);
}

export function rollingMonthWindowStart(endMonthKey: string): string {
  const { year, month } = parseMonthKey(endMonthKey);
  const start = addMonths(year, month, -(WINDOW_MONTHS - 1));
  return monthKey(start.year, start.month);
}

export function monthsBetweenInclusive(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let { year, month } = parseMonthKey(startKey);
  const end = parseMonthKey(endKey);
  while (year < end.year || (year === end.year && month <= end.month)) {
    keys.push(monthKey(year, month));
    const next = addMonths(year, month, 1);
    year = next.year;
    month = next.month;
  }
  return keys;
}

function occurredOnMonthKey(occurredOn: string): string {
  return occurredOn.slice(0, 7);
}

function addToBucket(buckets: MonthBucket, key: string, amount: number) {
  buckets.set(key, Math.round(((buckets.get(key) ?? 0) + amount) * 100) / 100);
}

export function allocateEntryToBuckets(
  entry: Pick<
    VehicleOperatingCost,
    "amount_eur" | "occurred_on" | "billing_period"
  >,
  windowStart: string,
  windowEnd: string,
  buckets: MonthBucket,
): void {
  const amount = Number(entry.amount_eur);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const startMonth = occurredOnMonthKey(entry.occurred_on);
  const period = entry.billing_period as OperatingCostBillingPeriod;

  if (period === "once") {
    if (compareMonthKeys(startMonth, windowStart) >= 0 && compareMonthKeys(startMonth, windowEnd) <= 0) {
      addToBucket(buckets, startMonth, amount);
    }
    return;
  }

  if (period === "monthly") {
    const from = compareMonthKeys(startMonth, windowStart) > 0 ? startMonth : windowStart;
    for (const key of monthsBetweenInclusive(from, windowEnd)) {
      if (compareMonthKeys(key, startMonth) >= 0) {
        addToBucket(buckets, key, amount);
      }
    }
    return;
  }

  if (period === "yearly") {
    const monthlyShare = amount / 12;
    let { year, month } = parseMonthKey(startMonth);
    for (let i = 0; i < 12; i++) {
      const key = monthKey(year, month);
      if (
        compareMonthKeys(key, windowStart) >= 0 &&
        compareMonthKeys(key, windowEnd) <= 0 &&
        compareMonthKeys(key, startMonth) >= 0
      ) {
        addToBucket(buckets, key, monthlyShare);
      }
      const next = addMonths(year, month, 1);
      year = next.year;
      month = next.month;
    }
  }
}

export function sumMonthBuckets(buckets: MonthBucket): number {
  let total = 0;
  for (const value of buckets.values()) {
    total += value;
  }
  return Math.round(total * 100) / 100;
}

export function averageMonthlyFromBuckets(buckets: MonthBucket): number {
  const total = sumMonthBuckets(buckets);
  return Math.round((total / WINDOW_MONTHS) * 100) / 100;
}

export function buildCategoryMonthBuckets(
  entries: VehicleOperatingCost[],
  windowStart: string,
  windowEnd: string,
): Record<OperatingCostCategory, MonthBucket> {
  const result = Object.fromEntries(
    OPERATING_COST_CATEGORIES.map((category) => [category, new Map<string, number>()]),
  ) as Record<OperatingCostCategory, MonthBucket>;

  for (const entry of entries) {
    allocateEntryToBuckets(
      entry,
      windowStart,
      windowEnd,
      result[entry.category as OperatingCostCategory],
    );
  }

  return result;
}

export function computeMonthlyAverages(
  entries: VehicleOperatingCost[],
  referenceDate = new Date(),
): {
  totalMonthlyAverage: number;
  categoryMonthlyAverages: Record<OperatingCostCategory, number>;
  windowMonths: number;
} {
  const windowEnd = rollingMonthWindowEnd(referenceDate);
  const windowStart = rollingMonthWindowStart(windowEnd);
  const allBuckets: MonthBucket = new Map();

  for (const entry of entries) {
    allocateEntryToBuckets(entry, windowStart, windowEnd, allBuckets);
  }

  const categoryBuckets = buildCategoryMonthBuckets(entries, windowStart, windowEnd);
  const categoryMonthlyAverages = Object.fromEntries(
    OPERATING_COST_CATEGORIES.map((category) => [
      category,
      averageMonthlyFromBuckets(categoryBuckets[category]),
    ]),
  ) as Record<OperatingCostCategory, number>;

  return {
    totalMonthlyAverage: averageMonthlyFromBuckets(allBuckets),
    categoryMonthlyAverages,
    windowMonths: WINDOW_MONTHS,
  };
}

export const OPERATING_COST_WINDOW_MONTHS = WINDOW_MONTHS;

export function listRollingWindowMonthKeys(referenceDate = new Date()): string[] {
  const windowEnd = rollingMonthWindowEnd(referenceDate);
  const windowStart = rollingMonthWindowStart(windowEnd);
  return monthsBetweenInclusive(windowStart, windowEnd);
}
