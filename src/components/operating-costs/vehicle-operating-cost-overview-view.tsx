"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createOperatingCost } from "@/actions/operating-costs";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import { buildOperatingCostSummary } from "@/lib/vehicles/operating-costs/summary";
import {
  OPERATING_COST_CATEGORIES,
  OPERATING_COST_CATEGORY_LABELS,
} from "@/lib/vehicles/operating-costs/types";
import type { VehicleOperatingCost } from "@/types/database";

import { ScanContent } from "@/components/layout/scan-content";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

import {
  emptyOperatingCostForm,
  OperatingCostFormFields,
} from "./operating-cost-form-fields";
import { MonthlyCostHero } from "./monthly-cost-hero";
import { showSavedToast } from "@/lib/ui/saved-toast";

import { OperatingCostDetailCharts } from "./operating-cost-detail-charts";
import { OperatingCostEntryList } from "./operating-cost-entry-list";

type VehicleOperatingCostOverviewViewProps = {
  vehicleSurfaceScope: VehicleSurfaceScope;
  tagUuid: string;
  vehicleId: string;
  vehicleModel: string;
  entries: VehicleOperatingCost[];
  readOnly?: boolean;
};

export function VehicleOperatingCostOverviewView({
  vehicleSurfaceScope,
  tagUuid,
  vehicleId,
  vehicleModel,
  entries,
  readOnly = false,
}: VehicleOperatingCostOverviewViewProps) {
  const router = useRouter();
  const dashboardHref = vehicleSurfaceHref(vehicleSurfaceScope);
  const tankenHref = vehicleSurfaceHref(vehicleSurfaceScope, "tanken");
  const dokumenteKostenHref = vehicleSurfaceHref(
    vehicleSurfaceScope,
    "dokumente/kosten",
  );
  const summary = buildOperatingCostSummary(entries);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyOperatingCostForm("insurance"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <ScanContent className="gap-5 pb-8">
      <header className="space-y-3">
        <PressableLink href={dashboardHref} variant="pill" className="vd-back-pill">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Dashboard
        </PressableLink>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Kosten & Ausgaben
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--vd-muted)]">
            {vehicleModel} · Betriebskosten
          </p>
        </div>
      </header>

      <MonthlyCostHero
        monthlyAverage={summary.totalMonthlyAverage}
        windowMonths={summary.windowMonths}
        entryCount={summary.entryCount}
      />

      <OperatingCostDetailCharts chart={summary.chart} />

      <section className="grid grid-cols-2 gap-3">
        {OPERATING_COST_CATEGORIES.map((category) => (
          <div key={category} className="zt-feature-panel p-3.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
              {OPERATING_COST_CATEGORY_LABELS[category]}
            </p>
            <p className="mt-1.5 text-[0.95rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
              {formatEur(summary.chart.categoryTotals[category])}
            </p>
            <p className="mt-0.5 text-[0.72rem] tabular-nums text-[color:var(--vd-muted)]">
              ø {formatEur(summary.categoryMonthlyAverages[category])}/M
            </p>
          </div>
        ))}
      </section>

      {!readOnly && !showForm ? (
        <PressableButton
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 py-3.5 text-[0.92rem] font-semibold text-white"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Kosten erfassen
        </PressableButton>
      ) : null}

      {!readOnly && showForm ? (
        <form
          className="space-y-4 zt-feature-panel p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await createOperatingCost({
                tagUuid,
                vehicleId,
                form,
              });
              if (result.status === "error") {
                setError(result.message);
                return;
              }
              showSavedToast();
              setShowForm(false);
              setForm(emptyOperatingCostForm("insurance"));
              router.refresh();
            });
          }}
        >
          <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
            Tanken erfasst du unter{" "}
            <Link
              href={tankenHref}
              className="font-medium text-[color:var(--vd-accent)] underline-offset-2 hover:underline"
            >
              Tanken
            </Link>
            .
          </p>
          <OperatingCostFormFields value={form} onChange={setForm} />
          {error ? (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          ) : null}
          <div className="flex gap-2">
            <PressableButton
              type="button"
              className="flex-1 rounded-2xl border border-[color:var(--vd-border)] py-3 text-[0.88rem] font-semibold"
              onClick={() => setShowForm(false)}
            >
              Abbrechen
            </PressableButton>
            <PressableButton
              type="submit"
              disabled={pending}
              className="flex-1 rounded-2xl bg-neutral-950 py-3 text-[0.88rem] font-semibold text-white"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
          </div>
        </form>
      ) : null}

      <section>
        <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
          Letzte Einträge
        </h2>
        <OperatingCostEntryList
          entries={summary.recentEntries}
          vehicleSurfaceScope={vehicleSurfaceScope}
          tagUuid={tagUuid}
          vehicleId={vehicleId}
          readOnly={readOnly}
        />
      </section>

      <p className="text-center text-[0.78rem] text-[color:var(--vd-muted)]">
        <Link
          href={dokumenteKostenHref}
          className="font-medium text-[color:var(--vd-accent)] underline-offset-2 hover:underline"
        >
          Umbau & Wartung aus Belegen & manuellen Einträgen
        </Link>
      </p>
    </ScanContent>
  );
}
