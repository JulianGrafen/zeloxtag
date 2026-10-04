"use client";

import { ArrowLeft, Fuel } from "lucide-react";

import { formatCompactGermanDate } from "@/lib/documents/format";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import { formatLitersPer100Km } from "@/lib/vehicles/operating-costs/fuel-consumption";
import { buildOperatingCostSummary } from "@/lib/vehicles/operating-costs/summary";
import type { VehicleOperatingCost } from "@/types/database";

import type { FuelScanTierSnapshot } from "@/lib/billing/subscription-types";

import { ScanContent } from "@/components/layout/scan-content";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

import { FuelLogActions } from "./fuel-log-actions";
import { OperatingCostEntryList } from "./operating-cost-entry-list";

type VehicleFuelLogViewProps = {
  vehicleSurfaceScope: VehicleSurfaceScope;
  tagUuid: string;
  vehicleId: string;
  vehicleModel: string;
  entries: VehicleOperatingCost[];
  readOnly?: boolean;
  fuelScanTier?: FuelScanTierSnapshot;
};

export function VehicleFuelLogView({
  vehicleSurfaceScope,
  tagUuid,
  vehicleId,
  vehicleModel,
  entries,
  readOnly = false,
  fuelScanTier,
}: VehicleFuelLogViewProps) {
  const fuelEntries = entries
    .filter((entry) => entry.category === "fuel")
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  const summary = buildOperatingCostSummary(entries);

  const last = summary.fuelStats.lastFill;
  const { litersPer100Km, averageLitersPer100Km, eurosPer100Km } =
    summary.fuelStats;

  return (
    <ScanContent className="gap-5">
      <header className="space-y-3">
        <PressableLink
          href={vehicleSurfaceHref(vehicleSurfaceScope)}
          variant="pill"
          className="vd-back-pill"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Dashboard
        </PressableLink>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Tanken
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--vd-muted)]">
            {vehicleModel}
          </p>
        </div>
      </header>

      <section className="zt-feature-panel p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
            <Fuel className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Letzter Tank
            </p>
            <p className="mt-1 text-[1.1rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
              {last ? formatEur(Number(last.amount_eur)) : "—"}
            </p>
            <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
              {last
                ? formatCompactGermanDate(last.occurred_on)
                : "Noch kein Eintrag"}
            </p>
          </div>
        </div>
        {litersPer100Km != null ? (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--vd-border)] pt-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Verbrauch
              </p>
              <p className="mt-1 text-[1rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
                {formatLitersPer100Km(litersPer100Km)}
              </p>
              <p className="mt-0.5 text-[0.72rem] text-[color:var(--vd-muted)]">
                letzte Tankung
              </p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Ø Verbrauch
              </p>
              <p className="mt-1 text-[1rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
                {formatLitersPer100Km(averageLitersPer100Km)}
              </p>
              {eurosPer100Km != null ? (
                <p className="mt-0.5 text-[0.72rem] text-[color:var(--vd-muted)]">
                  ca. {formatEur(eurosPer100Km)}/100 km
                </p>
              ) : null}
            </div>
          </div>
        ) : fuelEntries.length > 0 ? (
          <p className="mt-4 border-t border-[color:var(--vd-border)] pt-4 text-[0.78rem] text-[color:var(--vd-muted)]">
            Verbrauch: nach zwei Tankungen mit Kilometerstand und Literangabe
            berechenbar.
          </p>
        ) : null}
      </section>

      {!readOnly && fuelScanTier ? (
        <FuelLogActions tagUuid={tagUuid} fuelScanTier={fuelScanTier} />
      ) : null}

      <section>
        <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
          Verlauf
        </h2>
        <OperatingCostEntryList
          entries={fuelEntries}
          vehicleSurfaceScope={vehicleSurfaceScope}
          tagUuid={tagUuid}
          vehicleId={vehicleId}
          readOnly={readOnly}
          fuelOnly
        />
      </section>
    </ScanContent>
  );
}
