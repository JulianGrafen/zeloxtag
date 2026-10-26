"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Gauge,
  LineChart,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  CostOverviewChart,
  CostOverviewChartLegend,
  type CostOverviewChartMode,
} from "@/components/documents/cost-overview-chart";
import {
  COST_CHART_MAINTENANCE_COLOR,
  COST_CHART_MODIFICATION_COLOR,
} from "@/lib/documents/cost-overview-chart";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import {
  CostKpiCard,
  type CostKpi,
} from "@/components/operating-costs/cost-kpi-card";
import {
  IOS_SECTION_HEADER,
  IOSEmptyState,
  IOSListPage,
  InsetGroupedCard,
  InsetListRow,
  type IconBadgeTone,
} from "@/components/ui/ios";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import type { VehicleCostOverview } from "@/lib/documents/cost-overview";
import { cn } from "@/lib/utils";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import { formatCurrencyEUR } from "@/utils/formatters";

type VehicleCostOverviewViewProps = {
  vehicleSurfaceScope: VehicleSurfaceScope;
  vehicleModel: string;
  overview: VehicleCostOverview;
};

type BucketRow = { bucket: string; label: string; amount: number };

const BUCKET_EASE = [0.22, 1, 0.36, 1] as const;
const MIN_BAR_WIDTH_PCT = 4;

function missingAmountBannerStorageKey(vehicleId: string): string {
  return `zeloxtag:cost-overview:missing-amount-dismissed:${vehicleId}`;
}

function percentLabel(part: number, whole: number): string {
  const share = whole > 0 ? part / whole : 0;
  return `${Math.round(share * 100).toLocaleString("de-DE")} %`;
}

function CostSplitBar({
  modificationTotal,
  maintenanceTotal,
  reduceMotion,
}: {
  modificationTotal: number;
  maintenanceTotal: number;
  reduceMotion: boolean;
}) {
  const classifiedTotal = modificationTotal + maintenanceTotal;
  if (classifiedTotal <= 0) return null;

  const modShare = modificationTotal / classifiedTotal;
  const maintShare = maintenanceTotal / classifiedTotal;
  const modLabel = percentLabel(modificationTotal, classifiedTotal);
  const maintLabel = percentLabel(maintenanceTotal, classifiedTotal);

  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full"
          style={{ backgroundColor: COST_CHART_MODIFICATION_COLOR }}
          initial={{ width: "0%" }}
          animate={{ width: `${modShare * 100}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: BUCKET_EASE }}
          title={`Umbau ${modLabel}`}
        />
        <motion.div
          className="h-full"
          style={{ backgroundColor: COST_CHART_MAINTENANCE_COLOR }}
          initial={{ width: "0%" }}
          animate={{ width: `${maintShare * 100}%` }}
          transition={{
            duration: reduceMotion ? 0 : 0.7,
            delay: reduceMotion ? 0 : 0.08,
            ease: BUCKET_EASE,
          }}
          title={`Wartung ${maintLabel}`}
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums text-[#8E8E93]">
        <span>Umbau {modLabel}</span>
        <span>Wartung {maintLabel}</span>
      </div>
    </div>
  );
}

function ChartModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-white/[0.18] text-white" : "text-[#8E8E93]",
      )}
      aria-pressed={active}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function ChartModeToggle({
  mode,
  onChange,
}: {
  mode: CostOverviewChartMode;
  onChange: (mode: CostOverviewChartMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-[9px] bg-white/[0.08] p-0.5"
      role="group"
      aria-label="Diagrammtyp"
    >
      <ChartModeButton
        active={mode === "line"}
        icon={LineChart}
        label="Graph"
        onClick={() => onChange("line")}
      />
      <ChartModeButton
        active={mode === "bar"}
        icon={BarChart3}
        label="Balken"
        onClick={() => onChange("bar")}
      />
    </div>
  );
}

function YearlyChartCard({ series }: { series: VehicleCostOverview["yearlySeries"] }) {
  const [chartMode, setChartMode] = useState<CostOverviewChartMode>("line");

  return (
    <InsetGroupedCard header="Verlauf nach Jahr" cardClassName="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {chartMode === "bar" ? (
          <CostOverviewChartLegend />
        ) : (
          <p className="text-xs font-medium text-[#8E8E93]">
            Gesamt-Investition pro Jahr
          </p>
        )}
        <ChartModeToggle mode={chartMode} onChange={setChartMode} />
      </div>
      <CostOverviewChart series={series} mode={chartMode} />
    </InsetGroupedCard>
  );
}

function BucketShareBar({
  ratio,
  shareLabel,
  color,
  visible,
  reduceMotion,
}: {
  ratio: number;
  shareLabel: string;
  color: string;
  visible: boolean;
  reduceMotion: boolean;
}) {
  const widthPct = `${Math.max(MIN_BAR_WIDTH_PCT, Math.round(ratio * 100))}%`;

  return (
    <span className="mt-1.5 flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.span
          className="block h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={{ width: visible ? widthPct : "0%" }}
          transition={{ duration: reduceMotion ? 0 : 0.65, ease: BUCKET_EASE }}
        />
      </span>
      <span className="w-10 shrink-0 text-right tabular-nums">{shareLabel}</span>
    </span>
  );
}

function BucketSectionHeader({ title, total }: { title: string; total: number }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span>{title}</span>
      <span className="sr-only">: </span>
      <span className="tabular-nums normal-case tracking-normal">
        {formatCurrencyEUR(total)}
      </span>
    </span>
  );
}

function CostBucketSection({
  title,
  total,
  rows,
  icon,
  iconTone,
  barColor,
  emptyText,
}: {
  title: string;
  total: number;
  rows: BucketRow[];
  icon: LucideIcon;
  iconTone: IconBadgeTone;
  barColor: string;
  emptyText: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const reduceMotion = Boolean(useReducedMotion());
  const maxAmount = Math.max(...rows.map((row) => row.amount), 1);
  const header = <BucketSectionHeader title={title} total={total} />;

  if (rows.length === 0) {
    return (
      <section>
        <h2 className={IOS_SECTION_HEADER}>{header}</h2>
        <IOSEmptyState>{emptyText}</IOSEmptyState>
      </section>
    );
  }

  return (
    <div ref={ref}>
      <InsetGroupedCard header={header}>
        {rows.map((row) => (
          <InsetListRow
            key={row.bucket}
            emphasis="data"
            icon={icon}
            iconTone={iconTone}
            label={row.label}
            value={formatCurrencyEUR(row.amount)}
            valueVariant="numeric"
            sublabel={
              <BucketShareBar
                ratio={row.amount > 0 ? row.amount / maxAmount : 0}
                shareLabel={percentLabel(row.amount, total)}
                color={barColor}
                visible={reduceMotion || inView}
                reduceMotion={reduceMotion}
              />
            }
          />
        ))}
      </InsetGroupedCard>
    </div>
  );
}

function MissingAmountNotice({
  count,
  onDismiss,
}: {
  count: number;
  onDismiss: () => void;
}) {
  return (
    <div role="status">
      <InsetGroupedCard>
        <InsetListRow
          icon={AlertTriangle}
          iconTone="amber"
          emphasis="navigation"
          label={
            <>
              <span className="tabular-nums">{count}</span> Beleg
              {count === 1 ? "" : "e"} ohne Betrag — Summen können
              unvollständig sein.
            </>
          }
          trailing={
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8E8E93] transition-colors active:bg-white/[0.08]"
              aria-label="Hinweis schließen"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        />
      </InsetGroupedCard>
    </div>
  );
}

function useDismissedMissingAmountNotice(vehicleId: string, missingAmountCount: number) {
  const storageKey = missingAmountBannerStorageKey(vehicleId);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setHidden(raw !== null && Number(raw) === missingAmountCount);
    } catch {
      setHidden(false);
    }
  }, [storageKey, missingAmountCount]);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(storageKey, String(missingAmountCount));
    } catch {
      // ignore quota / private mode
    }
  };

  return { hidden, dismiss };
}

function buildModificationKpis(overview: VehicleCostOverview): CostKpi[] {
  const { modification, maintenance } = overview;
  const kpis: CostKpi[] = [
    { label: "Umbaukosten", value: formatCurrencyEUR(modification.total) },
    { label: "Wartung", value: formatCurrencyEUR(maintenance.total) },
    { label: "Ø pro Mod", value: formatCurrencyEUR(modification.averagePerPosition) },
  ];
  if (modification.mostExpensiveAmount != null) {
    kpis.push({
      label: "Teuerste Mod",
      value: formatCurrencyEUR(modification.mostExpensiveAmount),
      hint: modification.mostExpensiveLabel ?? undefined,
    });
  }
  return kpis;
}

export function VehicleCostOverviewView({
  vehicleSurfaceScope,
  vehicleModel,
  overview,
}: VehicleCostOverviewViewProps) {
  const belegeHref = `${vehicleSurfaceHref(vehicleSurfaceScope, "dokumente")}?type=invoice`;
  const scanHref = `${vehicleSurfaceHref(vehicleSurfaceScope)}?scan=1&type=invoice`;
  const hasData = overview.invoiceCount > 0;
  const missingAmountCount = overview.documentsWithoutAmountCount;
  const missingAmountNotice = useDismissedMissingAmountNotice(
    vehicleSurfaceScope.vehicleId,
    missingAmountCount,
  );
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <IOSListPage
      title="Kostenübersicht"
      subtitle={
        <span className="tabular-nums">
          {vehicleModel} · {overview.invoiceCount} Belege
        </span>
      }
      backHref={belegeHref}
      backLabel="Belege"
    >
      <CostKpiCard
        hero={{
          label: "Gesamt-Investment",
          value: formatCurrencyEUR(overview.totalInvestment),
          hint: "inkl. MwSt., Montage & manuelle Umbauten",
        }}
        kpis={hasData ? buildModificationKpis(overview) : []}
        heroAccessory={
          hasData ? (
            <CostSplitBar
              modificationTotal={overview.modification.total}
              maintenanceTotal={overview.maintenance.total}
              reduceMotion={reduceMotion}
            />
          ) : undefined
        }
      />

      {!hasData ? (
        <IOSEmptyState title="Noch keine Kosten erfasst">
          <p>
            Scanne Rechnungen oder trage Umbauten und Service manuell ein — mit
            Betrag erscheinen sie hier.
          </p>
          <PressableLink
            href={scanHref}
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-[15px] font-semibold text-black"
          >
            Beleg scannen
          </PressableLink>
        </IOSEmptyState>
      ) : (
        <>
          {missingAmountCount > 0 && !missingAmountNotice.hidden ? (
            <MissingAmountNotice
              count={missingAmountCount}
              onDismiss={missingAmountNotice.dismiss}
            />
          ) : null}

          <YearlyChartCard series={overview.yearlySeries} />

          {overview.bucketBreakdown.length > 0 ? (
            <CostBucketSection
              title="Umbau-Verteilung"
              total={overview.modification.total}
              rows={overview.bucketBreakdown}
              icon={Gauge}
              iconTone="purple"
              barColor={COST_CHART_MODIFICATION_COLOR}
              emptyText="Noch keine Umbau-Positionen."
            />
          ) : null}

          <CostBucketSection
            title="Wartung & Reparatur"
            total={overview.maintenance.total}
            rows={overview.maintenance.bucketBreakdown}
            icon={Wrench}
            iconTone="amber"
            barColor={COST_CHART_MAINTENANCE_COLOR}
            emptyText="Noch keine Inspektions- oder Reparatur-Belege."
          />
        </>
      )}

      <VehicleDataDisclaimer />
    </IOSListPage>
  );
}
