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

  const litersRaw = form.fuelLiters?.trim();
  const priceRaw = form.pricePerLiterEur?.trim();

  let formForSave = form;

  if (!litersRaw && priceRaw && form.amountEur?.trim()) {
    const amount = Number.parseFloat(form.amountEur.trim().replace(",", "."));
    const price = Number.parseFloat(priceRaw.replace(",", "."));
    if (
      Number.isFinite(amount) &&
      amount > 0 &&
      Number.isFinite(price) &&
      price > 0
    ) {
      const derived = Math.round((amount / price) * 100) / 100;
      formForSave = {
        ...form,
        fuelLiters: derived.toLocaleString("de-DE", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }),
      };
    }
  }

  const liters = formForSave.fuelLiters?.trim();
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

  if (priceRaw) {
    const price = Number.parseFloat(priceRaw.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) {
      return {
        ok: false,
        message: "Bitte einen gültigen Litpreis eingeben oder leer lassen.",
      };
    }
  }

  return normalizeOperatingCostInput(fuelFillFormToOperatingCostInput(formForSave));
}
