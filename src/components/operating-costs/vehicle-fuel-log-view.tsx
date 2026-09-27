"use client";

import { ArrowLeft, Fuel, Plus } from "lucide-react";

import { formatCompactGermanDate } from "@/lib/documents/format";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import { buildOperatingCostSummary } from "@/lib/vehicles/operating-costs/summary";
import type { VehicleOperatingCost } from "@/types/database";

import { ScanContent } from "@/components/layout/scan-content";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

import { OperatingCostEntryList } from "./operating-cost-entry-list";

type VehicleFuelLogViewProps = {
  tagUuid: string;
  vehicleId: string;
  vehicleModel: string;
  entries: VehicleOperatingCost[];
  readOnly?: boolean;
};

export function VehicleFuelLogView({
  tagUuid,
  vehicleId,
  vehicleModel,
  entries,
  readOnly = false,
}: VehicleFuelLogViewProps) {
  const fuelEntries = entries.filter((entry) => entry.category === "fuel");
  const summary = buildOperatingCostSummary(entries);

  const last = summary.fuelStats.lastFill;

  return (
    <ScanContent className="gap-5">
      <header className="space-y-3">
        <PressableLink
          href={`/v/${tagUuid}`}
          className="inline-flex items-center gap-2 text-[0.85rem] font-medium text-[color:var(--vd-muted)]"
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

      <section className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4">
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
              {summary.fuelStats.eurosPer100Km != null
                ? ` · ca. ${formatEur(summary.fuelStats.eurosPer100Km)}/100 km`
                : ""}
            </p>
          </div>
        </div>
      </section>

      {!readOnly ? (
        <PressableLink
          href={`/v/${tagUuid}/tanken/erfassen`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 py-3.5 text-[0.92rem] font-semibold text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Tankvorgang hinzufügen
        </PressableLink>
      ) : null}

      <section>
        <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
          Verlauf
        </h2>
        <OperatingCostEntryList
          entries={fuelEntries}
          tagUuid={tagUuid}
          vehicleId={vehicleId}
          readOnly={readOnly}
          fuelOnly
        />
      </section>
    </ScanContent>
  );
}
