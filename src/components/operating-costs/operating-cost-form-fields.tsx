"use client";

import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { parseMileageKmInput } from "@/lib/documents/format";
import {
  BILLING_PERIOD_LABELS,
  OPERATING_COST_CATEGORIES,
  OPERATING_COST_CATEGORY_LABELS,
  type OperatingCostFormInput,
} from "@/lib/vehicles/operating-costs/types";

const labelClass =
  "text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]";

const inputClass =
  "w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5 text-[0.95rem] text-[color:var(--vd-text)]";

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
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="op-cost-category">
            Kategorie
          </label>
          <select
            id="op-cost-category"
            className={inputClass}
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
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="op-cost-date">
            Datum
          </label>
          <GermanDateInput
            id="op-cost-date"
            value={value.occurredOn || null}
            onChange={(next) =>
              onChange({ ...value, occurredOn: next ?? value.occurredOn })
            }
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="op-cost-amount">
            Betrag (€)
          </label>
          <input
            id="op-cost-amount"
            className={inputClass}
            inputMode="decimal"
            placeholder="0,00"
            value={value.amountEur}
            onChange={(event) =>
              onChange({ ...value, amountEur: event.target.value })
            }
            required
          />
        </div>
      </div>

      {!isFuel ? (
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="op-cost-period">
            Abrechnung
          </label>
          <select
            id="op-cost-period"
            className={inputClass}
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
          </select>
        </div>
      ) : null}

      {isFuel ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="op-cost-liters">
              Liter (optional)
            </label>
            <input
              id="op-cost-liters"
              className={inputClass}
              inputMode="decimal"
              placeholder="z. B. 38"
              value={value.fuelLiters ?? ""}
              onChange={(event) =>
                onChange({ ...value, fuelLiters: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="op-cost-km">
              Kilometerstand
            </label>
            <MileageKmInput
              id="op-cost-km"
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
      ) : null}

      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="op-cost-note">
          Notiz (optional)
        </label>
        <input
          id="op-cost-note"
          className={inputClass}
          value={value.note ?? ""}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          placeholder="z. B. Volltankung, Teilkasko"
        />
      </div>
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
