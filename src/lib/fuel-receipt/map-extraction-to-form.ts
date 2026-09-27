import type { FuelFillFormState, FuelReceiptExtraction } from "./types";

function formatAmountForInput(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("de-DE", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatLitersForInput(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace(".", ",");
}

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
    next.amountEur = formatAmountForInput(extraction.totalAmount);
  }

  if (
    extraction.liters != null &&
    Number.isFinite(extraction.liters) &&
    extraction.liters > 0
  ) {
    next.fuelLiters = formatLitersForInput(extraction.liters);
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
    odometerKm: "",
    note: "",
  };
}
