"use client";

import { ChevronRight, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteOperatingCost } from "@/actions/operating-costs";
import { formatCompactGermanDate } from "@/lib/documents/format";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import {
  buildFuelConsumptionByEntryId,
  formatLitersPer100Km,
} from "@/lib/vehicles/operating-costs/fuel-consumption";
import {
  BILLING_PERIOD_LABELS,
  OPERATING_COST_CATEGORY_LABELS,
} from "@/lib/vehicles/operating-costs/types";
import type { VehicleOperatingCost } from "@/types/database";

import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";

type OperatingCostEntryListProps = {
  entries: VehicleOperatingCost[];
  tagUuid: string;
  vehicleId: string;
  readOnly?: boolean;
  fuelOnly?: boolean;
};

export function OperatingCostEntryList({
  entries,
  tagUuid,
  vehicleId,
  readOnly = false,
  fuelOnly = false,
}: OperatingCostEntryListProps) {
  const [pending, startTransition] = useTransition();
  const consumptionByEntryId = fuelOnly
    ? buildFuelConsumptionByEntryId(entries)
    : null;

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/60 px-4 py-8 text-center text-[0.88rem] text-[color:var(--vd-muted)]">
        {fuelOnly
          ? "Noch keine Tankungen eingetragen."
          : "Noch keine Kosten eingetragen."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[color:var(--vd-border)] overflow-hidden rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]">
      {entries.map((entry) => {
        const consumption = consumptionByEntryId?.get(entry.id);
        const editHref =
          fuelOnly && !readOnly
            ? `/v/${tagUuid}/tanken/${entry.id}`
            : null;

        return (
        <li
          key={entry.id}
          className="flex items-stretch gap-1"
        >
          {editHref ? (
            <PressableLink
              href={editHref}
              variant="row"
              className="group flex min-w-0 flex-1 items-start gap-3 px-4 py-3.5 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
                  {formatEur(Number(entry.amount_eur))}
                </p>
                <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
                  {formatCompactGermanDate(entry.occurred_on)}
                  {entry.fuel_liters != null
                    ? ` · ${entry.fuel_liters.toLocaleString("de-DE")} L`
                    : ""}
                  {entry.odometer_km != null
                    ? ` · ${entry.odometer_km.toLocaleString("de-DE")} km`
                    : ""}
                  {consumption
                    ? ` · ${formatLitersPer100Km(consumption.litersPer100Km)}`
                    : ""}
                </p>
                {entry.note ? (
                  <p className="mt-1 text-[0.75rem] text-[color:var(--vd-muted)]">
                    {entry.note}
                  </p>
                ) : null}
              </div>
              <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[0.75rem] font-medium text-[color:var(--vd-muted)]">
                Bearbeiten
                <ChevronRight
                  className="h-4 w-4 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5"
                  aria-hidden
                />
              </span>
            </PressableLink>
          ) : (
            <div className="min-w-0 flex-1 px-4 py-3.5">
              <p className="text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
                {formatEur(Number(entry.amount_eur))}
                {!fuelOnly ? (
                  <span className="ml-2 text-[0.78rem] font-medium text-[color:var(--vd-muted)]">
                    {OPERATING_COST_CATEGORY_LABELS[entry.category]}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
                {formatCompactGermanDate(entry.occurred_on)}
                {entry.category === "fuel" && entry.fuel_liters != null
                  ? ` · ${entry.fuel_liters.toLocaleString("de-DE")} L`
                  : ""}
                {entry.category === "fuel" && entry.odometer_km != null
                  ? ` · ${entry.odometer_km.toLocaleString("de-DE")} km`
                  : ""}
                {!fuelOnly && entry.billing_period !== "once"
                  ? ` · ${BILLING_PERIOD_LABELS[entry.billing_period]}`
                  : ""}
                {consumption
                  ? ` · ${formatLitersPer100Km(consumption.litersPer100Km)}`
                  : ""}
              </p>
              {entry.note ? (
                <p className="mt-1 text-[0.75rem] text-[color:var(--vd-muted)]">
                  {entry.note}
                </p>
              ) : null}
            </div>
          )}
          {!readOnly ? (
            <PressableButton
              type="button"
              disabled={pending}
              className="my-2 mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full border border-[color:var(--vd-border)] text-[color:var(--vd-muted)]"
              aria-label="Eintrag löschen"
              onClick={() => {
                startTransition(async () => {
                  await deleteOperatingCost({
                    tagUuid,
                    vehicleId,
                    entryId: entry.id,
                  });
                });
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </PressableButton>
          ) : null}
        </li>
        );
      })}
    </ul>
  );
}
