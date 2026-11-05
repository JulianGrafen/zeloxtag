import {
  formatFuelAmountForInput,
  formatFuelLitersForInput,
  formatFuelPricePerLiterForInput,
} from "./fuel-fill-format";
import type { FuelFillFormState, FuelReceiptExtraction } from "./types";

export function mapExtractionToFuelFillForm(
  extraction: FuelReceiptExtraction,
  current: FuelFillFormState,
): FuelFillFormState {
  const next: FuelFillFormState = { ...current };

  if (extraction.date?.trim()) {
    next.occurredOn = extraction.date.trim();
  }

  if (
    extraction.totalAmount != null &&
    Number.isFinite(extraction.totalAmount) &&
    extraction.totalAmount > 0
  ) {
    next.amountEur = formatFuelAmountForInput(extraction.totalAmount);
  }

  if (
    extraction.liters != null &&
    Number.isFinite(extraction.liters) &&
    extraction.liters > 0
  ) {
    next.fuelLiters = formatFuelLitersForInput(extraction.liters);
  }

  if (
    extraction.pricePerLiter != null &&
    Number.isFinite(extraction.pricePerLiter) &&
    extraction.pricePerLiter > 0
  ) {
    next.pricePerLiterEur = formatFuelPricePerLiterForInput(
      extraction.pricePerLiter,
    );
  }

  return next;
}

export function emptyFuelFillFormState(): FuelFillFormState {
  const today = new Date();
  const berlin = new Date(
    today.toLocaleString("en-US", { timeZone: "Europe/Berlin" }),
  );
  const iso = `${berlin.getFullYear()}-${String(berlin.getMonth() + 1).padStart(2, "0")}-${String(berlin.getDate()).padStart(2, "0")}`;

  return {
    occurredOn: iso,
    amountEur: "",
    fuelLiters: "",
    pricePerLiterEur: "",
    odometerKm: "",
    note: "",
  };
}
