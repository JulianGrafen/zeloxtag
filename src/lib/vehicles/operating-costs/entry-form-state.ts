import type { OperatingCostFormInput } from "./types";
import type { VehicleOperatingCost } from "@/types/database";

function formatAmountForInput(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("de-DE", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function operatingCostToFormInput(
  entry: VehicleOperatingCost,
): OperatingCostFormInput {
  return {
    category: entry.category,
    amountEur: formatAmountForInput(Number(entry.amount_eur)),
    occurredOn: entry.occurred_on,
    billingPeriod: entry.billing_period,
    note: entry.note ?? "",
    fuelLiters:
      entry.fuel_liters != null
        ? entry.fuel_liters.toLocaleString("de-DE")
        : "",
    odometerKm:
      entry.odometer_km != null ? String(entry.odometer_km) : "",
  };
}
