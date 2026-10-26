"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatLitersPer100Km } from "@/lib/vehicles/operating-costs/fuel-consumption";
import { buildOperatingCostSummary } from "@/lib/vehicles/operating-costs/summary";
import type { OperatingCostSummary } from "@/lib/vehicles/operating-costs/types";
import type { VehicleOperatingCost } from "@/types/database";
import { formatCurrencyEUR, formatDateDE } from "@/utils/formatters";

import type { FuelScanTierSnapshot } from "@/lib/billing/subscription-types";

import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import { IOSListPage } from "@/components/ui/ios";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

import { CostKpiCard, type CostKpi } from "./cost-kpi-card";
import { FuelLogActions } from "./fuel-log-actions";
import { FuelScanProUpgradeModal } from "./fuel-scan-pro-upgrade-modal";
import { OperatingCostEntryList } from "./operating-cost-entry-list";

type VehicleFuelLogViewProps = {
  vehicleSurfaceScope: VehicleSurfaceScope;
  tagUuid: string;
  vehicleId: string;
  entries: VehicleOperatingCost[];
  readOnly?: boolean;
  fuelScanTier?: FuelScanTierSnapshot;
};

function fuelEntryCountLabel(count: number): string {
  return `${count.toLocaleString("de-DE")} ${count === 1 ? "Tankung" : "Tankungen"}`;
}

function consumptionKpis(fuelStats: OperatingCostSummary["fuelStats"]): CostKpi[] {
  const { litersPer100Km, averageLitersPer100Km, eurosPer100Km } = fuelStats;
  if (litersPer100Km == null) return [];
  return [
    {
      label: "Verbrauch",
      value: formatLitersPer100Km(litersPer100Km),
      hint: "letzte Tankung",
    },
    {
      label: "Ø Verbrauch",
      value: formatLitersPer100Km(averageLitersPer100Km),
      hint: eurosPer100Km != null ? `ca. ${formatCurrencyEUR(eurosPer100Km)}/100 km` : undefined,
    },
  ];
}

function FuelSummaryCard({
  fuelStats,
  hasFuelEntries,
}: {
  fuelStats: OperatingCostSummary["fuelStats"];
  hasFuelEntries: boolean;
}) {
  const last = fuelStats.lastFill;
  const kpis = consumptionKpis(fuelStats);
  const showConsumptionHint = kpis.length === 0 && hasFuelEntries;

  return (
    <CostKpiCard
      hero={{
        label: "Letzter Tank",
        value: last ? formatCurrencyEUR(Number(last.amount_eur)) : "—",
        hint: last ? (formatDateDE(last.occurred_on) ?? undefined) : "Noch kein Eintrag",
      }}
      kpis={kpis}
      heroAccessory={
        showConsumptionHint ? (
          <p className="text-xs leading-snug text-[#8E8E93]">
            Verbrauch: nach zwei Tankungen mit Kilometerstand und Literangabe
            berechenbar.
          </p>
        ) : undefined
      }
    />
  );
}

export function VehicleFuelLogView({
  vehicleSurfaceScope,
  tagUuid,
  entries,
  readOnly = false,
  fuelScanTier,
}: VehicleFuelLogViewProps) {
  const router = useRouter();
  const [fuelPaywallOpen, setFuelPaywallOpen] = useState(false);
  const fuelCaptureHref = vehicleSurfaceHref(
    vehicleSurfaceScope,
    "tanken/erfassen",
  );
  const fuelManualHref = vehicleSurfaceHref(
    vehicleSurfaceScope,
    "tanken/manuell",
  );

  const fuelEntries = entries
    .filter((entry) => entry.category === "fuel")
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  const summary = buildOperatingCostSummary(entries);

  const overlay =
    !readOnly && fuelScanTier ? (
      <>
        <FuelScanProUpgradeModal
          open={fuelPaywallOpen}
          tagUuid={tagUuid}
          onClose={() => setFuelPaywallOpen(false)}
          onManualEntry={() => {
            router.push(fuelManualHref);
          }}
        />
        <DashboardScanFab
          tagUuid={tagUuid}
          directAction="menu"
          menuTitle="Tankbeleg hinzufügen"
          hideFuelAction
          scanHref={fuelCaptureHref}
          scanActionLabel="Tankbeleg scannen"
          onOpenScanner={() => {
            if (!fuelScanTier.canScan) {
              setFuelPaywallOpen(true);
              return;
            }
            router.push(fuelCaptureHref);
          }}
          manualEntryHref={fuelManualHref}
          manualActionLabel="Manuell erfassen"
          manualActionDescription="Liter, Preis und km ohne Scan"
        />
      </>
    ) : null;

  return (
    <IOSListPage
      title="Tanken"
      subtitle={
        <span className="tabular-nums">{fuelEntryCountLabel(fuelEntries.length)}</span>
      }
      backHref={vehicleSurfaceHref(vehicleSurfaceScope)}
      overlay={overlay}
    >
      <FuelSummaryCard
        fuelStats={summary.fuelStats}
        hasFuelEntries={fuelEntries.length > 0}
      />

      {!readOnly ? <FuelLogActions manualHref={fuelManualHref} /> : null}

      <OperatingCostEntryList
        header="Verlauf"
        entries={fuelEntries}
        vehicleSurfaceScope={vehicleSurfaceScope}
        readOnly={readOnly}
        fuelOnly
      />
    </IOSListPage>
  );
}
