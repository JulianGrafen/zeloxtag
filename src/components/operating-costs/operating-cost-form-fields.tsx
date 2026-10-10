"use client";

import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import {
  GarageField,
  GarageFieldCell,
  GarageFieldRow,
  GarageInsetInput,
  GarageInsetSelect,
} from "@/components/ui/garage-field";
import { parseMileageKmInput } from "@/lib/documents/format";
import {
  BILLING_PERIOD_LABELS,
  OPERATING_COST_CATEGORIES,
  OPERATING_COST_CATEGORY_LABELS,
  type OperatingCostFormInput,
} from "@/lib/vehicles/operating-costs/types";

type OperatingCostFormFieldsProps = {
  value: OperatingCostFormInput;
  onChange: (next: OperatingCostFormInput) => void;
  /** Hide category picker (e.g. fuel-only form). */
  lockCategory?: boolean;
};

export function OperatingCostFormFields({
  value,
  onChange,
  lockCategory = false,
}: OperatingCostFormFieldsProps) {
  const isFuel = value.category === "fuel";

  return (
    <div className="grid gap-4">
      {!lockCategory ? (
        <GarageField label="Kategorie" htmlFor="op-cost-category">
          <GarageInsetSelect
            id="op-cost-category"
            value={value.category}
            onChange={(event) =>
              onChange({
                ...value,
                category: event.target.value as OperatingCostFormInput["category"],
                billingPeriod:
                  event.target.value === "fuel" ? "once" : value.billingPeriod,
              })
            }
          >
            {OPERATING_COST_CATEGORIES.filter((c) => c !== "fuel").map(
              (category) => (
                <option key={category} value={category}>
                  {OPERATING_COST_CATEGORY_LABELS[category]}
                </option>
              ),
            )}
          </GarageInsetSelect>
        </GarageField>
      ) : null}

      <GarageFieldRow>
        <GarageFieldCell label="Datum" htmlFor="op-cost-date">
          <GermanDateInput
            id="op-cost-date"
            variant="inset"
            value={value.occurredOn || null}
            onChange={(next) =>
              onChange({ ...value, occurredOn: next ?? value.occurredOn })
            }
            required
          />
        </GarageFieldCell>
        <GarageFieldCell label="Betrag (€)" htmlFor="op-cost-amount">
          <GarageInsetInput
            id="op-cost-amount"
            inputMode="decimal"
            placeholder="0,00"
            className="tabular-nums"
            value={value.amountEur}
            onChange={(event) =>
              onChange({ ...value, amountEur: event.target.value })
            }
            required
          />
        </GarageFieldCell>
      </GarageFieldRow>

      {!isFuel ? (
        <GarageField label="Abrechnung" htmlFor="op-cost-period">
          <GarageInsetSelect
            id="op-cost-period"
            value={value.billingPeriod}
            onChange={(event) =>
              onChange({
                ...value,
                billingPeriod: event.target.value as OperatingCostFormInput["billingPeriod"],
              })
            }
          >
            {(["once", "monthly", "yearly"] as const).map((period) => (
              <option key={period} value={period}>
                {BILLING_PERIOD_LABELS[period]}
              </option>
            ))}
          </GarageInsetSelect>
        </GarageField>
      ) : null}

      {isFuel ? (
        <GarageFieldRow>
          <GarageFieldCell label="Liter (optional)" htmlFor="op-cost-liters">
            <GarageInsetInput
              id="op-cost-liters"
              inputMode="decimal"
              placeholder="z. B. 38"
              value={value.fuelLiters ?? ""}
              onChange={(event) =>
                onChange({ ...value, fuelLiters: event.target.value })
              }
            />
          </GarageFieldCell>
          <GarageFieldCell label="Kilometerstand" htmlFor="op-cost-km">
            <MileageKmInput
              id="op-cost-km"
              variant="inset"
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
          </GarageFieldCell>
        </GarageFieldRow>
      ) : null}

      <GarageField label="Notiz (optional)" htmlFor="op-cost-note">
        <GarageInsetInput
          id="op-cost-note"
          value={value.note ?? ""}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          placeholder="z. B. Volltankung, Teilkasko"
        />
      </GarageField>
    </div>
  );
}

export function emptyOperatingCostForm(
  category: OperatingCostFormInput["category"] = "insurance",
): OperatingCostFormInput {
  const today = new Date();
  const berlin = new Date(
    today.toLocaleString("en-US", { timeZone: "Europe/Berlin" }),
  );
  const iso = `${berlin.getFullYear()}-${String(berlin.getMonth() + 1).padStart(2, "0")}-${String(berlin.getDate()).padStart(2, "0")}`;

  return {
    category,
    amountEur: "",
    occurredOn: iso,
    billingPeriod: category === "fuel" ? "once" : "yearly",
    note: "",
    fuelLiters: "",
    odometerKm: "",
  };
}
