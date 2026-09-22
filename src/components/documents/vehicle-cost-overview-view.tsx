"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, BarChart3, TrendingUp, Wrench } from "lucide-react";
import { useRef } from "react";

import { CostOverviewChart } from "@/components/documents/cost-overview-chart";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import type { VehicleCostOverview } from "@/lib/documents/cost-overview";

type VehicleCostOverviewViewProps = {
  tagUuid: string;
  vehicleModel: string;
  overview: VehicleCostOverview;
};

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
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]"
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
}: {
  label: string;
  amount: number;
  ratio: number;
  showBarAtTarget: boolean;
  reduceMotion: boolean;
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
          className="h-full rounded-full bg-[color:var(--vd-accent)]"
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
}: {
  rows: BucketRow[];
  maxAmount: number;
  className?: string;
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
        />
      ))}
    </motion.ul>
  );
}

export function VehicleCostOverviewView({
  tagUuid,
  vehicleModel,
  overview,
}: VehicleCostOverviewViewProps) {
  const maxBucket = Math.max(
    ...overview.bucketBreakdown.map((row) => row.amount),
    1,
  );
  const maxMaintenanceBucket = Math.max(
    ...overview.maintenance.bucketBreakdown.map((row) => row.amount),
    1,
  );
  const hasData = overview.invoiceCount > 0;

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={`/v/${tagUuid}/dokumente?type=invoice`}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
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
              {vehicleModel} · {overview.invoiceCount} Belege erfasst
            </p>
          </div>
        </header>

        {!hasData ? (
          <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 text-center shadow-[var(--vd-shadow-sm)]">
            <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
              Noch keine Belege für eine Kostenübersicht
            </p>
            <p className="mt-2 text-[0.85rem] text-[color:var(--vd-muted)]">
              Scanne Rechnungen — Beträge erscheinen hier automatisch.
            </p>
            <PressableLink
              href={`/v/${tagUuid}?scan=1&type=invoice`}
              className="mt-5 inline-flex rounded-xl bg-[color:var(--vd-accent)] px-4 py-2.5 text-[0.85rem] font-semibold text-white"
            >
              Beleg scannen
            </PressableLink>
          </div>
        ) : (
          <>
            {overview.documentsWithoutAmountCount > 0 ? (
              <p
                className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-[0.8rem] text-amber-900 dark:text-amber-100"
                role="status"
              >
                {overview.documentsWithoutAmountCount} Beleg
                {overview.documentsWithoutAmountCount === 1 ? "" : "e"} ohne
                Betrag — Summen können unvollständig sein.
              </p>
            ) : null}

            {overview.bucketBreakdown.length > 0 ? (
              <section className="space-y-4 rounded-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
                <div className="flex items-center gap-2">
                  <BarChart3
                    className="h-4 w-4 text-[color:var(--vd-accent)]"
                    aria-hidden
                  />
                  <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                    Umbau-Verteilung
                  </h2>
                </div>
                <AnimatedCostBucketList
                  rows={overview.bucketBreakdown}
                  maxAmount={maxBucket}
                />
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                Umbaukosten
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
                    className="h-4 w-4 text-[color:var(--vd-accent)]"
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
                />
              ) : (
                <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
                  Noch keine Inspektions- oder Reparatur-Belege.
                </p>
              )}
            </section>

            <section className="space-y-3 rounded-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
              <div className="flex items-center gap-2">
                <TrendingUp
                  className="h-4 w-4 text-[color:var(--vd-accent)]"
                  aria-hidden
                />
                <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                  Investition über die Zeit
                </h2>
              </div>
              <CostOverviewChart series={overview.yearlySeries} />
            </section>
          </>
        )}

        <VehicleDataDisclaimer />
      </div>
    </div>
  );
}
