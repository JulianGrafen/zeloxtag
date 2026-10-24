import type { OperatingCostFormInput } from "@/lib/vehicles/operating-costs/types";
import { normalizeOperatingCostInput } from "@/lib/vehicles/operating-costs/normalize";

import { completeFuelFillDerivedFields } from "./fuel-fill-derived-fields";
import type { FuelFillFormState } from "./types";
import { parseFuelFillDecimal } from "./fuel-fill-format";

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

  const formForSave = completeFuelFillDerivedFields(form);

  const liters = parseFuelFillDecimal(formForSave.fuelLiters);
  if (formForSave.fuelLiters?.trim() && liters == null) {
    return {
      ok: false,
      message: "Bitte eine gültige Literangabe eingeben oder leer lassen.",
    };
  }

  const price = parseFuelFillDecimal(formForSave.pricePerLiterEur);
  if (formForSave.pricePerLiterEur?.trim() && price == null) {
    return {
      ok: false,
      message: "Bitte einen gültigen Litpreis eingeben oder leer lassen.",
    };
  }

  return normalizeOperatingCostInput(fuelFillFormToOperatingCostInput(formForSave));
}
