"use client";

import { BarChart3, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createOperatingCost } from "@/actions/operating-costs";
import { buildOperatingCostSummary } from "@/lib/vehicles/operating-costs/summary";
import type { VehicleOperatingCost } from "@/types/database";

import { IOS_LINK, InsetGroupedCard, InsetListRow, IOSListPage } from "@/components/ui/ios";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";
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

const DEFAULT_FORM_CATEGORY = "insurance";
const FORM_BUTTON_BASE = "flex-1 rounded-xl py-3 text-[15px] font-semibold";

type OperatingCostFormValue = ReturnType<typeof emptyOperatingCostForm>;

function OperatingCostCreateForm({
  tagUuid,
  vehicleId,
  tankenHref,
  form,
  onFormChange,
  onClose,
}: {
  tagUuid: string;
  vehicleId: string;
  tankenHref: string;
  form: OperatingCostFormValue;
  onFormChange: (form: OperatingCostFormValue) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <InsetGroupedCard header="Kosten erfassen">
      <form
        className="space-y-4 p-4"
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
            onFormChange(emptyOperatingCostForm(DEFAULT_FORM_CATEGORY));
            onClose();
            router.refresh();
          });
        }}
      >
        <p className="text-[13px] text-[#8E8E93]">
          Tanken erfasst du unter{" "}
          <Link href={tankenHref} className={cn("font-medium", IOS_LINK)}>
            Tanken
          </Link>
          .
        </p>
        <OperatingCostFormFields value={form} onChange={onFormChange} />
        {error ? (
          <p className="text-sm text-[#FF453A]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <PressableButton
            type="button"
            className={cn(FORM_BUTTON_BASE, "bg-white/[0.08] text-white")}
            onClick={onClose}
          >
            Abbrechen
          </PressableButton>
          <PressableButton
            type="submit"
            disabled={pending}
            className={cn(FORM_BUTTON_BASE, "bg-white text-black")}
          >
            {pending ? "Speichern…" : "Speichern"}
          </PressableButton>
        </div>
      </form>
    </InsetGroupedCard>
  );
}

export function VehicleOperatingCostOverviewView({
  vehicleSurfaceScope,
  tagUuid,
  vehicleId,
  vehicleModel,
  entries,
  readOnly = false,
}: VehicleOperatingCostOverviewViewProps) {
  const dashboardHref = vehicleSurfaceHref(vehicleSurfaceScope);
  const tankenHref = vehicleSurfaceHref(vehicleSurfaceScope, "tanken");
  const dokumenteKostenHref = vehicleSurfaceHref(
    vehicleSurfaceScope,
    "dokumente/kosten",
  );
  const summary = buildOperatingCostSummary(entries);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyOperatingCostForm(DEFAULT_FORM_CATEGORY));

  return (
    <IOSListPage
      title="Kosten & Ausgaben"
      subtitle={`${vehicleModel} · Betriebskosten`}
      backHref={dashboardHref}
    >
      <MonthlyCostHero
        monthlyAverage={summary.totalMonthlyAverage}
        windowTotal={summary.chart.grandTotal}
        windowMonths={summary.windowMonths}
        entryCount={summary.entryCount}
      />

      {!readOnly && !showForm ? (
        <InsetGroupedCard>
          <InsetListRow
            onPress={() => setShowForm(true)}
            icon={Plus}
            iconTone="blue"
            emphasis="navigation"
            label="Kosten erfassen"
            chevron
          />
        </InsetGroupedCard>
      ) : null}

      {!readOnly && showForm ? (
        <OperatingCostCreateForm
          tagUuid={tagUuid}
          vehicleId={vehicleId}
          tankenHref={tankenHref}
          form={form}
          onFormChange={setForm}
          onClose={() => setShowForm(false)}
        />
      ) : null}

      <OperatingCostDetailCharts
        chart={summary.chart}
        categoryMonthlyAverages={summary.categoryMonthlyAverages}
      />

      <OperatingCostEntryList
        header="Letzte Einträge"
        entries={summary.recentEntries}
        vehicleSurfaceScope={vehicleSurfaceScope}
        readOnly={readOnly}
      />

      <InsetGroupedCard>
        <InsetListRow
          href={dokumenteKostenHref}
          icon={BarChart3}
          iconTone="purple"
          emphasis="navigation"
          label="Umbau & Wartung"
          sublabel="aus Belegen & manuellen Einträgen"
        />
      </InsetGroupedCard>
    </IOSListPage>
  );
}
