"use client";

import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import type { BuildPlannerSummary } from "@/lib/build-planner/types";

type BuildPlannerBudgetHeroProps = {
  summary: BuildPlannerSummary;
};

export function BuildPlannerBudgetHero({ summary }: BuildPlannerBudgetHeroProps) {
  const planned = summary.plannedTotalEur;
  const spent = summary.spentEur;

  return (
    <section className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
            Geplant
          </p>
          <p className="mt-1 text-[1.15rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
            {formatEur(planned)}
          </p>
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
            Aus Belegen
          </p>
          <p className="mt-1 text-[1.15rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
            {formatEur(spent)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[0.78rem] text-[color:var(--vd-muted)]">
          <span>Fortschritt (offene Builds)</span>
          <span className="tabular-nums font-medium text-[color:var(--vd-text)]">
            {summary.buildProgressPct}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--vd-border)]">
          <div
            className="h-full bg-[color:var(--vd-text)] transition-all"
            style={{ width: `${summary.buildProgressPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
