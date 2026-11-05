"use client";

import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import {
  GarageField,
  GarageFieldCell,
  GarageFieldRow,
  GarageInsetInputWithSuffix,
} from "@/components/ui/garage-field";
import { parseMileageKmInput } from "@/lib/documents/format";
import { applyFuelFillFieldChange } from "@/lib/fuel-receipt/fuel-fill-derived-fields";
import type { FuelFillFormState } from "@/lib/fuel-receipt/types";

type FuelFillFormFieldsProps = {
  value: FuelFillFormState;
  onChange: (next: FuelFillFormState) => void;
  disabled?: boolean;
};

export function FuelFillFormFields({
  value,
  onChange,
  disabled = false,
}: FuelFillFormFieldsProps) {
  return (
    <div className="grid gap-4">
      <GarageField label="Datum" htmlFor="fuel-fill-date">
        <GermanDateInput
          id="fuel-fill-date"
          variant="inset"
          value={value.occurredOn || null}
          onChange={(next) =>
            onChange({ ...value, occurredOn: next ?? value.occurredOn })
          }
          required
          disabled={disabled}
        />
      </GarageField>

      <GarageFieldRow>
        <GarageFieldCell label="Liter" htmlFor="fuel-fill-liters">
          <GarageInsetInputWithSuffix
            id="fuel-fill-liters"
            suffix="L"
            inputMode="decimal"
            placeholder="z. B. 38"
            className="tabular-nums"
            value={value.fuelLiters}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                applyFuelFillFieldChange(
                  value,
                  "fuelLiters",
                  event.target.value,
                ),
              )
            }
          />
        </GarageFieldCell>
        <GarageFieldCell label="Literpreis" htmlFor="fuel-fill-price-per-liter">
          <GarageInsetInputWithSuffix
            id="fuel-fill-price-per-liter"
            suffix="€/L"
            inputMode="decimal"
            placeholder="z. B. 1,89"
            className="tabular-nums !pr-11"
            value={value.pricePerLiterEur}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                applyFuelFillFieldChange(
                  value,
                  "pricePerLiterEur",
                  event.target.value,
                ),
              )
            }
          />
        </GarageFieldCell>
      </GarageFieldRow>

      <GarageField label="Gesamtbetrag" htmlFor="fuel-fill-amount">
        <GarageInsetInputWithSuffix
          id="fuel-fill-amount"
          inputMode="decimal"
          placeholder="0,00"
          className="tabular-nums"
          value={value.amountEur}
          disabled={disabled}
          required
          onChange={(event) =>
            onChange(
              applyFuelFillFieldChange(value, "amountEur", event.target.value),
            )
          }
        />
      </GarageField>

      <GarageField label="Kilometerstand" htmlFor="fuel-fill-km">
        <MileageKmInput
          id="fuel-fill-km"
          variant="inset"
          required
          disabled={disabled}
          value={
            value.odometerKm?.trim()
              ? parseMileageKmInput(value.odometerKm)
              : null
          }
          onChange={(km) =>
            onChange({
              ...value,
              odometerKm: km != null ? String(km) : "",
            })
          }
        />
      </GarageField>
    </div>
  );
}
