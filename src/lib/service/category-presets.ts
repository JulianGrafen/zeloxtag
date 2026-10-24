import {
  DEFAULT_OIL_INTERVAL_KM,
  DEFAULT_OIL_INTERVAL_MONTHS,
  resolveOilChangeInterval,
} from "@/lib/documents/oil-changes";
import { DEFAULT_BRAKE_INTERVAL_KM, DEFAULT_BRAKE_INTERVAL_MONTHS } from "@/lib/documents/brake-service";
import type { VehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { ServiceRecordCategory } from "./service-record";

export type ServiceCategoryPreset = {
  defaultTitle: string;
  label: string;
  intervalKm: number;
  intervalMonths: number;
  quickChip: boolean;
};

const BASE_PRESETS: Record<
  Exclude<ServiceRecordCategory, "oil_change" | "brakes_front" | "brakes_rear">,
  ServiceCategoryPreset
> = {
  spark_plugs: {
    defaultTitle: "Zündkerzen",
    label: "Zündkerzen",
    intervalKm: 30_000,
    intervalMonths: 48,
    quickChip: true,
  },
  transmission_fluid: {
    defaultTitle: "Getriebespülung / Getriebeöl",
    label: "Getriebeöl",
    intervalKm: 60_000,
    intervalMonths: 48,
    quickChip: true,
  },
  brake_fluid: {
    defaultTitle: "Bremsflüssigkeit",
    label: "Bremsflüssigkeit",
    intervalKm: 0,
    intervalMonths: 24,
    quickChip: true,
  },
  cabin_filter: {
    defaultTitle: "Innenraumfilter",
    label: "Innenraumfilter",
    intervalKm: 15_000,
    intervalMonths: 12,
    quickChip: true,
  },
  air_filter: {
    defaultTitle: "Luftfilter",
    label: "Luftfilter",
    intervalKm: 30_000,
    intervalMonths: 24,
    quickChip: true,
  },
  timing_belt: {
    defaultTitle: "Zahnriemen",
    label: "Zahnriemen",
    intervalKm: 120_000,
    intervalMonths: 72,
    quickChip: false,
  },
  inspection: {
    defaultTitle: "Inspektion / Service",
    label: "Inspektion",
    intervalKm: 15_000,
    intervalMonths: 12,
    quickChip: true,
  },
  tuev: {
    defaultTitle: "TÜV / HU",
    label: "TÜV",
    intervalKm: 0,
    intervalMonths: 24,
    quickChip: false,
  },
  custom: {
    defaultTitle: "Wartung",
    label: "Sonstiges",
    intervalKm: 10_000,
    intervalMonths: 12,
    quickChip: false,
  },
};

export function serviceCategoryPreset(
  category: ServiceRecordCategory,
  specs?: Pick<
    VehicleTechSpecs,
    "oilChangeIntervalKm" | "oilChangeIntervalMonths"
  > | null,
): ServiceCategoryPreset {
  if (category === "oil_change") {
    const interval = resolveOilChangeInterval(specs);
    return {
      defaultTitle: "Ölwechsel inkl. Filter",
      label: "Ölwechsel",
      intervalKm: interval.intervalKm ?? DEFAULT_OIL_INTERVAL_KM,
      intervalMonths: interval.intervalMonths ?? DEFAULT_OIL_INTERVAL_MONTHS,
      quickChip: true,
    };
  }
  if (category === "brakes_front") {
    return {
      defaultTitle: "Bremsscheiben & Beläge VA",
      label: "Bremsen vorne",
      intervalKm: DEFAULT_BRAKE_INTERVAL_KM,
      intervalMonths: DEFAULT_BRAKE_INTERVAL_MONTHS,
      quickChip: true,
    };
  }
  if (category === "brakes_rear") {
    return {
      defaultTitle: "Bremsscheiben & Beläge HA",
      label: "Bremsen hinten",
      intervalKm: DEFAULT_BRAKE_INTERVAL_KM,
      intervalMonths: DEFAULT_BRAKE_INTERVAL_MONTHS,
      quickChip: true,
    };
  }
  return BASE_PRESETS[category];
}

export function serviceCategoryLabel(category: ServiceRecordCategory): string {
  return serviceCategoryPreset(category).label;
}

/**
 * Scheckheft filter + form chips — fixed workshop order (not enum iteration).
 * Fluids/service → filters → ignition/drivetrain → brake system.
 */
export const QUICK_CHIP_CATEGORY_ORDER: readonly ServiceRecordCategory[] = [
  "oil_change",
  "inspection",
  "air_filter",
  "cabin_filter",
  "spark_plugs",
  "transmission_fluid",
  "brake_fluid",
  "brakes_front",
  "brakes_rear",
];

export const QUICK_CHIP_CATEGORIES: ServiceRecordCategory[] =
  QUICK_CHIP_CATEGORY_ORDER.filter((category) =>
    serviceCategoryPreset(category).quickChip,
  );

export function computeNextIntervals(input: {
  category: ServiceRecordCategory;
  serviceDate: string;
  mileageKm: number;
  specs?: Pick<
    VehicleTechSpecs,
    "oilChangeIntervalKm" | "oilChangeIntervalMonths"
  > | null;
}): { nextIntervalMileage: number | null; nextIntervalDate: string | null } {
  const preset = serviceCategoryPreset(input.category, input.specs);
  const nextIntervalMileage =
    preset.intervalKm > 0 && input.mileageKm > 0
      ? input.mileageKm + preset.intervalKm
      : preset.intervalKm > 0
        ? preset.intervalKm
        : null;

  let nextIntervalDate: string | null = null;
  if (preset.intervalMonths > 0 && /^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate)) {
    const [y, m, d] = input.serviceDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1 + preset.intervalMonths, d));
    if (!Number.isNaN(date.getTime())) {
      nextIntervalDate = date.toISOString().slice(0, 10);
    }
  }

  return { nextIntervalMileage, nextIntervalDate };
}
