import type { FuelFillFormState } from "./types";
import {
  formatFuelAmountForInput,
  formatFuelLitersForInput,
  formatFuelPricePerLiterForInput,
  formatFuelPricePerLiterFromTotal,
  parseFuelFillDecimal,
} from "./fuel-fill-format";

export type FuelFillNumericField =
  | "fuelLiters"
  | "pricePerLiterEur"
  | "amountEur";

function deriveThirdField(
  next: FuelFillFormState,
  edited: FuelFillNumericField,
): FuelFillFormState {
  const liters = parseFuelFillDecimal(next.fuelLiters);
  const price = parseFuelFillDecimal(next.pricePerLiterEur);
  const amount = parseFuelFillDecimal(next.amountEur);

  if (edited === "fuelLiters") {
    if (liters != null && price != null) {
      return { ...next, amountEur: formatFuelAmountForInput(liters * price) };
    }
    if (liters != null && amount != null) {
      return {
        ...next,
        pricePerLiterEur: formatFuelPricePerLiterFromTotal(amount, liters),
      };
    }
    return next;
  }

  if (edited === "pricePerLiterEur") {
    if (liters != null && price != null) {
      return { ...next, amountEur: formatFuelAmountForInput(liters * price) };
    }
    if (price != null && amount != null) {
      return {
        ...next,
        fuelLiters: formatFuelLitersForInput(amount / price),
      };
    }
    return next;
  }

  if (amount != null && liters != null) {
    return {
      ...next,
      pricePerLiterEur: formatFuelPricePerLiterFromTotal(amount, liters),
    };
  }
  if (amount != null && price != null) {
    return { ...next, fuelLiters: formatFuelLitersForInput(amount / price) };
  }
  return next;
}

/** Live form update: keep edited field, derive the third from the other two. */
export function applyFuelFillFieldChange(
  form: FuelFillFormState,
  field: FuelFillNumericField,
  rawValue: string,
): FuelFillFormState {
  const next = { ...form, [field]: rawValue };
  return deriveThirdField(next, field);
}

/** On save: fill any still-empty field when two of three are known. */
export function completeFuelFillDerivedFields(
  form: FuelFillFormState,
): FuelFillFormState {
  let next = { ...form };
  const liters = parseFuelFillDecimal(next.fuelLiters);
  const price = parseFuelFillDecimal(next.pricePerLiterEur);
  const amount = parseFuelFillDecimal(next.amountEur);

  if (liters != null && price != null && amount == null) {
    next = {
      ...next,
      amountEur: formatFuelAmountForInput(liters * price),
    };
  } else if (liters != null && amount != null && price == null) {
    next = {
      ...next,
      pricePerLiterEur: formatFuelPricePerLiterFromTotal(amount, liters),
    };
  } else if (price != null && amount != null && liters == null) {
    next = {
      ...next,
      fuelLiters: formatFuelLitersForInput(amount / price),
    };
  }

  return next;
}
