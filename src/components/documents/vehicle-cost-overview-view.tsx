"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  LineChart,
  Wrench,
  X,
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
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import type { VehicleCostOverview } from "@/lib/documents/cost-overview";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleCostOverviewViewProps = {
  vehicleSurfaceScope: VehicleSurfaceScope;
  vehicleModel: string;
  overview: VehicleCostOverview;
};

function missingAmountBannerStorageKey(vehicleId: string): string {
  return `zeloxtag:cost-overview:missing-amount-dismissed:${vehicleId}`;
}

function CostStatCard({
  label,
  value,
  hint,
  featured,
}: {
  label: string;
  value: string;
  hint?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        featured
          ? "border-[color:var(--vd-accent)]/35 bg-[color:var(--vd-surface-elevated)] shadow-[0_0_32px_-8px_color-mix(in_srgb,var(--vd-accent)_45%,transparent)]"
          : "zt-feature-panel border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]"
      }`}
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tabular-nums tracking-[-0.02em] text-[color:var(--vd-text)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 line-clamp-2 text-[0.72rem] leading-snug text-[color:var(--vd-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const BUCKET_EASE = [0.22, 1, 0.36, 1] as const;

const bucketListVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

const bucketRowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: BUCKET_EASE },
  },
};

function CostBucketRow({
  label,
  amount,
  ratio,
  showBarAtTarget,
  reduceMotion,
  barColor,
}: {
  label: string;
  amount: number;
  ratio: number;
  showBarAtTarget: boolean;
  reduceMotion: boolean;
  barColor: string;
}) {
  const widthPct = `${Math.max(4, Math.round(ratio * 100))}%`;

  return (
    <motion.li className="space-y-1.5" variants={bucketRowVariants}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.82rem] font-medium text-[color:var(--vd-text)]">
          {label}
        </span>
        <span className="shrink-0 text-[0.82rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
          {formatEur(amount)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color:var(--vd-surface-elevated)] ring-1 ring-[color:var(--vd-border)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: "0%" }}
          animate={{ width: showBarAtTarget ? widthPct : "0%" }}
          transition={{
            duration: reduceMotion ? 0 : 0.65,
            ease: BUCKET_EASE,
          }}
        />
      </div>
    </motion.li>
  );
}

type BucketRow = { bucket: string; label: string; amount: number };

function AnimatedCostBucketList({
  rows,
  maxAmount,
  className,
  barColor = COST_CHART_MODIFICATION_COLOR,
}: {
  rows: BucketRow[];
  maxAmount: number;
  className?: string;
  barColor?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const reduceMotion = useReducedMotion();
  const showBarAtTarget = reduceMotion || inView;
  const listAnimate = reduceMotion ? undefined : inView ? "visible" : "hidden";

  return (
    <motion.ul
      ref={ref}
      className={className ?? "space-y-3"}
      variants={reduceMotion ? undefined : bucketListVariants}
      initial={reduceMotion ? undefined : "hidden"}
      animate={listAnimate}
    >
      {rows.map((row) => (
        <CostBucketRow
          key={row.bucket}
          label={row.label}
          amount={row.amount}
          ratio={row.amount > 0 ? row.amount / maxAmount : 0}
          showBarAtTarget={showBarAtTarget}
          reduceMotion={Boolean(reduceMotion)}
          barColor={barColor}
        />
      ))}
    </motion.ul>
  );
}

function CostSplitHero({
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
  const modPct = Math.round(modShare * 100);
  const maintPct = Math.round(maintShare * 100);

  return (
    <div className="mt-4 space-y-3 border-t border-[color:var(--vd-border)] pt-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Umbau vs. Wartung
          </p>
        </div>
        <p className="text-right text-[0.72rem] tabular-nums text-[color:var(--vd-muted)]">
          {formatEur(classifiedTotal)}
        </p>
      </div>

      <div className="flex h-3 overflow-hidden rounded-full bg-[color:var(--vd-surface-elevated)] ring-1 ring-[color:var(--vd-border)]">
        <motion.div
          className="h-full bg-[color:var(--vd-text)]"
          initial={{ width: "0%" }}
          animate={{ width: `${modShare * 100}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: BUCKET_EASE }}
          title={`Umbau ${modPct}%`}
        />
        <motion.div
          className="h-full bg-[color:var(--vd-muted)]"
          initial={{ width: "0%" }}
          animate={{ width: `${maintShare * 100}%` }}
          transition={{
            duration: reduceMotion ? 0 : 0.7,
            delay: reduceMotion ? 0 : 0.08,
            ease: BUCKET_EASE,
          }}
          title={`Wartung ${maintPct}%`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
            Umbaukosten
          </p>
          <p className="mt-0.5 text-[1rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
            {formatEur(modificationTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
            Wartung
          </p>
          <p className="mt-0.5 text-[1rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
            {formatEur(maintenanceTotal)}
          </p>
        </div>
      </div>
    </div>
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
      className="inline-flex rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-0.5"
      role="group"
      aria-label="Diagrammtyp"
    >
      <button
        type="button"
        onClick={() => onChange("line")}
        className={`inline-flex items-center gap-1.5 rounded-[0.65rem] px-2.5 py-1.5 text-[0.72rem] font-semibold transition-colors ${
          mode === "line"
            ? "bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-sm"
            : "text-[color:var(--vd-muted)]"
        }`}
        aria-pressed={mode === "line"}
      >
        <LineChart className="h-3.5 w-3.5" aria-hidden />
        Graph
      </button>
      <button
        type="button"
        onClick={() => onChange("bar")}
        className={`inline-flex items-center gap-1.5 rounded-[0.65rem] px-2.5 py-1.5 text-[0.72rem] font-semibold transition-colors ${
          mode === "bar"
            ? "bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-sm"
            : "text-[color:var(--vd-muted)]"
        }`}
        aria-pressed={mode === "bar"}
      >
        <BarChart3 className="h-3.5 w-3.5" aria-hidden />
        Balken
      </button>
    </div>
  );
}

export function VehicleCostOverviewView({
  vehicleSurfaceScope,
  vehicleModel,
  overview,
}: VehicleCostOverviewViewProps) {
  const belegeHref = `${vehicleSurfaceHref(vehicleSurfaceScope, "dokumente")}?type=invoice`;
  const scanHref = `${vehicleSurfaceHref(vehicleSurfaceScope)}?scan=1&type=invoice`;
  const maxBucket = Math.max(
    ...overview.bucketBreakdown.map((row) => row.amount),
    1,
  );
  const maxMaintenanceBucket = Math.max(
    ...overview.maintenance.bucketBreakdown.map((row) => row.amount),
    1,
  );
  const hasData = overview.invoiceCount > 0;
  const missingAmountCount = overview.documentsWithoutAmountCount;
  const missingAmountStorageKey = missingAmountBannerStorageKey(
    vehicleSurfaceScope.vehicleId,
  );
  const [missingAmountBannerHidden, setMissingAmountBannerHidden] =
    useState(false);
  const [chartMode, setChartMode] = useState<CostOverviewChartMode>("line");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(missingAmountStorageKey);
      setMissingAmountBannerHidden(
        raw !== null && Number(raw) === missingAmountCount,
      );
    } catch {
      setMissingAmountBannerHidden(false);
    }
  }, [missingAmountStorageKey, missingAmountCount]);

  const dismissMissingAmountBanner = () => {
    setMissingAmountBannerHidden(true);
    try {
      localStorage.setItem(missingAmountStorageKey, String(missingAmountCount));
    } catch {
      // ignore quota / private mode
    }
  };

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={belegeHref}
            variant="pill"
            className="vd-back-pill"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Belege
          </PressableLink>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-accent)]/25 bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-accent)]">
              Gesamt-Investment
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.04em] text-[color:var(--vd-text)] sm:text-[2.35rem]">
              {formatEur(overview.totalInvestment)}
            </p>
            <p className="mt-2 text-[0.82rem] text-[color:var(--vd-muted)]">
              {vehicleModel} · {overview.invoiceCount} Einträge erfasst
            </p>
            {hasData ? (
              <>
                <CostSplitHero
                  modificationTotal={overview.modification.total}
                  maintenanceTotal={overview.maintenance.total}
                  reduceMotion={Boolean(reduceMotion)}
                />
                <div className="mt-5 space-y-3 border-t border-[color:var(--vd-border)] pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                      Verlauf nach Jahr
                    </p>
                    <ChartModeToggle mode={chartMode} onChange={setChartMode} />
                  </div>
                  {chartMode === "bar" ? (
                    <CostOverviewChartLegend />
                  ) : (
                    <p className="text-[0.72rem] font-medium text-[color:var(--vd-muted)]">
                      Gesamt-Investition pro Jahr
                    </p>
                  )}
                  <CostOverviewChart
                    series={overview.yearlySeries}
                    mode={chartMode}
                  />
                </div>
              </>
            ) : null}
          </div>
        </header>

        {!hasData ? (
          <div className="zt-feature-panel p-6 text-center shadow-[var(--vd-shadow-sm)]">
            <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
              Noch keine Kosten erfasst
            </p>
            <p className="mt-2 text-[0.85rem] text-[color:var(--vd-muted)]">
              Scanne Rechnungen oder trage Umbauten und Service manuell ein —
              mit Betrag erscheinen sie hier.
            </p>
            <PressableLink
              href={scanHref}
              className="mt-5 inline-flex rounded-xl bg-[color:var(--vd-accent)] px-4 py-2.5 text-[0.85rem] font-semibold text-white"
            >
              Beleg scannen
            </PressableLink>
          </div>
        ) : (
          <>
            {missingAmountCount > 0 && !missingAmountBannerHidden ? (
              <div
                className="relative rounded-xl border border-amber-500/25 bg-amber-500/8 py-3 pl-4 pr-11 text-[0.8rem] text-amber-900 dark:text-amber-100"
                role="status"
              >
                {missingAmountCount} Beleg
                {missingAmountCount === 1 ? "" : "e"} ohne Betrag — Summen
                können unvollständig sein.
                <button
                  type="button"
                  onClick={dismissMissingAmountBanner}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-amber-900/70 transition-colors hover:bg-amber-500/15 hover:text-amber-950 dark:text-amber-100/80 dark:hover:text-amber-50"
                  aria-label="Hinweis schließen"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}

            {overview.bucketBreakdown.length > 0 ? (
              <section className="space-y-4 rounded-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3
                      className="h-4 w-4 text-[color:var(--vd-muted)]"
                      aria-hidden
                    />
                    <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                      Umbau-Verteilung
                    </h2>
                  </div>
                  <span className="text-[0.95rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
                    {formatEur(overview.modification.total)}
                  </span>
                </div>
                <AnimatedCostBucketList
                  rows={overview.bucketBreakdown}
                  maxAmount={maxBucket}
                  barColor={COST_CHART_MODIFICATION_COLOR}
                />
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                Umbaukosten · Kennzahlen
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <CostStatCard
                  label="Gesamt"
                  value={formatEur(overview.modification.total)}
                  featured
                />
                <CostStatCard
                  label="Ø pro Mod"
                  value={formatEur(overview.modification.averagePerPosition)}
                />
              </div>
              {overview.modification.mostExpensiveAmount != null ? (
                <CostStatCard
                  label="Teuerste Mod"
                  value={formatEur(overview.modification.mostExpensiveAmount)}
                  hint={overview.modification.mostExpensiveLabel ?? undefined}
                  featured
                />
              ) : null}
            </section>

            <section className="space-y-3 rounded-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wrench
                    className="h-4 w-4 text-[color:var(--vd-muted)]"
                    aria-hidden
                  />
                  <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                    Wartungs- & Reparatur-Verteilung
                  </h2>
                </div>
                <span className="text-[0.95rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
                  {formatEur(overview.maintenance.total)}
                </span>
              </div>
              {overview.maintenance.bucketBreakdown.length > 0 ? (
                <AnimatedCostBucketList
                  className="space-y-3 pt-1"
                  rows={overview.maintenance.bucketBreakdown}
                  maxAmount={maxMaintenanceBucket}
                  barColor={COST_CHART_MAINTENANCE_COLOR}
                />
              ) : (
                <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
                  Noch keine Inspektions- oder Reparatur-Belege.
                </p>
              )}
            </section>

          </>
        )}

        <VehicleDataDisclaimer />
      </div>
    </div>
  );
}
