"use client";

import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { parseMileageKmInput } from "@/lib/documents/format";
import type { FuelFillFormState } from "@/lib/fuel-receipt/types";

const labelClass =
  "text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]";

const inputClass =
  "w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5 text-[0.95rem] text-[color:var(--vd-text)]";

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
      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="fuel-fill-date">
          Datum
        </label>
        <GermanDateInput
          id="fuel-fill-date"
          value={value.occurredOn || null}
          onChange={(next) =>
            onChange({ ...value, occurredOn: next ?? value.occurredOn })
          }
          required
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="fuel-fill-liters">
            Liter
          </label>
          <input
            id="fuel-fill-liters"
            className={inputClass}
            inputMode="decimal"
            placeholder="z. B. 38"
            value={value.fuelLiters}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, fuelLiters: event.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="fuel-fill-price-per-liter">
            Litpreis (€/L)
          </label>
          <input
            id="fuel-fill-price-per-liter"
            className={inputClass}
            inputMode="decimal"
            placeholder="z. B. 1,89"
            value={value.pricePerLiterEur}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, pricePerLiterEur: event.target.value })
            }
          />
        </div>
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <label className={labelClass} htmlFor="fuel-fill-amount">
            Gesamtbetrag (€)
          </label>
          <input
            id="fuel-fill-amount"
            className={inputClass}
            inputMode="decimal"
            placeholder="0,00"
            value={value.amountEur}
            disabled={disabled}
            required
            onChange={(event) =>
              onChange({ ...value, amountEur: event.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="fuel-fill-km">
          Kilometerstand
        </label>
        <MileageKmInput
          id="fuel-fill-km"
          required
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
      </div>
    </div>
  );
}
