import type { FuelFillFormState } from "@/lib/fuel-receipt/types";
import type { VehicleOperatingCost } from "@/types/database";

function formatAmountForInput(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("de-DE", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatPricePerLiterForInput(amountEur: number, liters: number): string {
  if (liters <= 0) return "";
  const price = amountEur / liters;
  const rounded = Math.round(price * 1000) / 1000;
  return rounded.toLocaleString("de-DE", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
  });
}

function formatLitersForInput(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function fuelOperatingCostToFormState(
  entry: VehicleOperatingCost,
): FuelFillFormState {
  const amount = Number(entry.amount_eur);
  const liters =
    entry.fuel_liters != null && entry.fuel_liters > 0 ? entry.fuel_liters : null;

  return {
    occurredOn: entry.occurred_on,
    amountEur: formatAmountForInput(amount),
    fuelLiters: liters != null ? formatLitersForInput(liters) : "",
    pricePerLiterEur:
      liters != null ? formatPricePerLiterForInput(amount, liters) : "",
    odometerKm:
      entry.odometer_km != null ? String(entry.odometer_km) : "",
    note: entry.note ?? "",
  };
}
