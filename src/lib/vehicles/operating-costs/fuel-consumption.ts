import type { VehicleOperatingCost } from "@/types/database";

export type FuelConsumptionSegment = {
  entryId: string;
  litersPer100Km: number;
  eurosPer100Km: number | null;
  kmDelta: number;
};

export type FuelConsumptionStats = {
  latestLitersPer100Km: number | null;
  latestEurosPer100Km: number | null;
  averageLitersPer100Km: number | null;
  segmentCount: number;
};

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sortFuelFillsChronologically(
  entries: VehicleOperatingCost[],
): VehicleOperatingCost[] {
  return [...entries]
    .filter((entry) => entry.category === "fuel")
    .sort((a, b) => {
      const byDate = a.occurred_on.localeCompare(b.occurred_on);
      if (byDate !== 0) return byDate;
      return a.created_at.localeCompare(b.created_at);
    });
}

/** Liters consumed on fill B divided by km since previous fill A → l/100 km. */
export function computeFuelConsumptionSegments(
  entries: VehicleOperatingCost[],
): FuelConsumptionSegment[] {
  const sorted = sortFuelFillsChronologically(entries);
  const segments: FuelConsumptionSegment[] = [];

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (previous.odometer_km == null || current.odometer_km == null) {
      continue;
    }

    const kmDelta = current.odometer_km - previous.odometer_km;
    if (kmDelta <= 0) continue;

    const liters = current.fuel_liters;
    if (liters == null || liters <= 0) continue;

    const litersPer100Km = round((liters / kmDelta) * 100, 1);
    const cost = Number(current.amount_eur);
    const eurosPer100Km =
      Number.isFinite(cost) && cost > 0
        ? round((cost / kmDelta) * 100, 2)
        : null;

    segments.push({
      entryId: current.id,
      litersPer100Km,
      eurosPer100Km,
      kmDelta,
    });
  }

  return segments;
}

export function buildFuelConsumptionByEntryId(
  entries: VehicleOperatingCost[],
): Map<string, FuelConsumptionSegment> {
  const map = new Map<string, FuelConsumptionSegment>();
  for (const segment of computeFuelConsumptionSegments(entries)) {
    map.set(segment.entryId, segment);
  }
  return map;
}

export function computeFuelConsumptionStats(
  entries: VehicleOperatingCost[],
): FuelConsumptionStats {
  const segments = computeFuelConsumptionSegments(entries);
  if (segments.length === 0) {
    return {
      latestLitersPer100Km: null,
      latestEurosPer100Km: null,
      averageLitersPer100Km: null,
      segmentCount: 0,
    };
  }

  const latest = segments[segments.length - 1]!;
  const averageLiters =
    segments.reduce((sum, segment) => sum + segment.litersPer100Km, 0) /
    segments.length;

  return {
    latestLitersPer100Km: latest.litersPer100Km,
    latestEurosPer100Km: latest.eurosPer100Km,
    averageLitersPer100Km: round(averageLiters, 1),
    segmentCount: segments.length,
  };
}

export function formatLitersPer100Km(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} l/100 km`;
}
