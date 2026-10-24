"use client";

import { ChevronRight } from "lucide-react";

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

import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type OperatingCostEntryListProps = {
  entries: VehicleOperatingCost[];
  vehicleSurfaceScope: VehicleSurfaceScope;
  readOnly?: boolean;
  fuelOnly?: boolean;
};

function resolveEntryDetailHref(
  entry: VehicleOperatingCost,
  vehicleSurfaceScope: VehicleSurfaceScope,
  readOnly: boolean,
): string | null {
  if (readOnly) return null;
  if (entry.category === "fuel") {
    return vehicleSurfaceHref(vehicleSurfaceScope, `tanken/${entry.id}`);
  }
  return vehicleSurfaceHref(vehicleSurfaceScope, `kosten/${entry.id}`);
}

export function OperatingCostEntryList({
  entries,
  vehicleSurfaceScope,
  readOnly = false,
  fuelOnly = false,
}: OperatingCostEntryListProps) {
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
    <ul className="divide-y divide-[color:var(--vd-border)] overflow-hidden zt-feature-panel">
      {entries.map((entry) => {
        const consumption = consumptionByEntryId?.get(entry.id);
        const detailHref = resolveEntryDetailHref(
          entry,
          vehicleSurfaceScope,
          readOnly,
        );

        const metaParts: string[] = [formatCompactGermanDate(entry.occurred_on)];
        if (fuelOnly || entry.category === "fuel") {
          if (entry.fuel_liters != null) {
            metaParts.push(`${entry.fuel_liters.toLocaleString("de-DE")} L`);
          }
          if (entry.odometer_km != null) {
            metaParts.push(`${entry.odometer_km.toLocaleString("de-DE")} km`);
          }
        } else if (entry.billing_period !== "once") {
          metaParts.push(BILLING_PERIOD_LABELS[entry.billing_period]);
        }
        if (consumption) {
          metaParts.push(formatLitersPer100Km(consumption.litersPer100Km));
        }
        const metaLine = metaParts.join(" · ");

        const rowContent = (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
                {formatEur(Number(entry.amount_eur))}
                {!fuelOnly ? (
                  <span className="ml-2 text-[0.78rem] font-medium text-[color:var(--vd-muted)]">
                    {OPERATING_COST_CATEGORY_LABELS[entry.category]}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 flex items-center justify-between gap-2 text-[0.78rem] text-[color:var(--vd-muted)]">
                <span className="min-w-0 truncate">{metaLine}</span>
                {detailHref ? (
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5 group-data-[pressed=true]:text-zinc-300"
                    aria-hidden
                  />
                ) : null}
              </p>
              {entry.note ? (
                <p className="mt-1 text-[0.75rem] text-[color:var(--vd-muted)]">
                  {entry.note}
                </p>
              ) : null}
            </div>
          </>
        );

        return (
          <li key={entry.id}>
            {detailHref ? (
              <PressableLink
                href={detailHref}
                variant="row"
                className="group flex w-full items-start gap-3 px-4 py-3.5 text-left"
              >
                {rowContent}
              </PressableLink>
            ) : (
              <div className="px-4 py-3.5">{rowContent}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
