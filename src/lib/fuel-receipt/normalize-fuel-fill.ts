import type { OperatingCostFormInput } from "@/lib/vehicles/operating-costs/types";
import { normalizeOperatingCostInput } from "@/lib/vehicles/operating-costs/normalize";

import type { FuelFillFormState } from "./types";

export function fuelFillFormToOperatingCostInput(
  form: FuelFillFormState,
): OperatingCostFormInput {
  return {
    category: "fuel",
    billingPeriod: "once",
    amountEur: form.amountEur,
    occurredOn: form.occurredOn,
    fuelLiters: form.fuelLiters,
    odometerKm: form.odometerKm,
    note: form.note,
  };
}

export function normalizeFuelFillInput(
  form: FuelFillFormState,
): ReturnType<typeof normalizeOperatingCostInput> {
  if (!form.odometerKm?.trim()) {
    return {
      ok: false,
      message: "Bitte den Kilometerstand eingeben.",
    };
  }

  const liters = form.fuelLiters?.trim();
  if (liters) {
    const normalized = liters.replace(",", ".");
    const value = Number.parseFloat(normalized);
    if (!Number.isFinite(value) || value <= 0) {
      return {
        ok: false,
        message: "Bitte eine gültige Literangabe eingeben oder leer lassen.",
      };
    }
  }

  return normalizeOperatingCostInput(fuelFillFormToOperatingCostInput(form));
}
