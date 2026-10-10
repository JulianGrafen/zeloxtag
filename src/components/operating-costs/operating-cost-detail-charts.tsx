"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";

import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import { OPERATING_COST_CATEGORY_COLORS } from "@/lib/vehicles/operating-costs/category-colors";
import type { OperatingCostChartData } from "@/lib/vehicles/operating-costs/chart-data";
import {
  buildDonutChartGeometry,
  buildStackedChartGeometry,
  formatStackedChartAxisAmount,
  STACKED_CHART_HEIGHT,
  STACKED_CHART_PAD_TOP,
  STACKED_CHART_WIDTH,
} from "@/lib/vehicles/operating-costs/chart-geometry";
import {
  OPERATING_COST_CATEGORIES,
  OPERATING_COST_CATEGORY_LABELS,
} from "@/lib/vehicles/operating-costs/types";

const EASE = [0.22, 1, 0.36, 1] as const;

type OperatingCostDetailChartsProps = {
  chart: OperatingCostChartData;
};

function ChartLegend() {
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-2 px-1">
      {OPERATING_COST_CATEGORIES.map((category) => (
        <li
          key={category}
          className="flex items-center gap-1.5 text-[0.68rem] font-medium text-[color:var(--vd-muted)]"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: OPERATING_COST_CATEGORY_COLORS[category] }}
            aria-hidden
          />
          {OPERATING_COST_CATEGORY_LABELS[category]}
        </li>
      ))}
    </ul>
  );
}

function MonthlyStackedChart({
  chart,
  showFinal,
  reduceMotion,
}: {
  chart: OperatingCostChartData;
  showFinal: boolean;
  reduceMotion: boolean;
}) {
  const geometry = useMemo(() => buildStackedChartGeometry(chart), [chart]);
  if (!geometry) return null;

  const plotTop = STACKED_CHART_PAD_TOP;

  return (
    <svg
      viewBox={`0 0 ${STACKED_CHART_WIDTH} ${STACKED_CHART_HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label="Fahrzeugkosten nach Monat"
    >
      {geometry.yTicks.map((tick) => {
        const y =
          geometry.plotBottom -
          (tick / geometry.maxValue) *
            (geometry.plotBottom - plotTop);
        return (
          <g key={tick}>
            <line
              x1={STACKED_CHART_WIDTH - 8}
              x2={STACKED_CHART_WIDTH - 28}
              y1={y}
              y2={y}
              stroke="var(--vd-border)"
              strokeWidth={1}
              opacity={0.6}
            />
            <text
              x={24}
              y={y + 3}
              textAnchor="end"
              className="fill-[color:var(--vd-muted)] text-[8px] font-medium"
            >
              {formatStackedChartAxisAmount(tick)} €
            </text>
          </g>
        );
      })}

      {geometry.columns.map((column, columnIndex) => (
        <g key={column.monthKey}>
          {column.segments.map((segment, segmentIndex) => (
            <motion.rect
              key={segment.category}
              x={column.x}
              y={segment.y}
              width={column.width}
              height={segment.height}
              rx={2}
              fill={OPERATING_COST_CATEGORY_COLORS[segment.category]}
              initial={reduceMotion ? false : { scaleY: 0, opacity: 0 }}
              animate={{
                scaleY: showFinal ? 1 : 0,
                opacity: showFinal ? 1 : 0,
              }}
              style={{ transformOrigin: `${column.x + column.width / 2}px ${segment.y + segment.height}px` }}
              transition={{
                duration: 0.35,
                delay: reduceMotion
                  ? 0
                  : columnIndex * 0.02 + segmentIndex * 0.04,
                ease: EASE,
              }}
            />
          ))}
          <text
            x={column.x + column.width / 2}
            y={STACKED_CHART_HEIGHT - 8}
            textAnchor="middle"
            className="fill-[color:var(--vd-muted)] text-[8px] font-medium"
          >
            {column.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function CategoryDonutChart({
  chart,
  showFinal,
  reduceMotion,
}: {
  chart: OperatingCostChartData;
  showFinal: boolean;
  reduceMotion: boolean;
}) {
  const geometry = useMemo(() => buildDonutChartGeometry(chart), [chart]);
  if (!geometry) return null;

  return (
    <div className="relative mx-auto w-full max-w-[220px]">
      <svg viewBox="0 0 200 200" className="h-auto w-full" role="img" aria-label="Kosten nach Kategorie">
        {geometry.slices.map((slice, index) => (
          <motion.path
            key={slice.category}
            d={slice.path}
            fill={OPERATING_COST_CATEGORY_COLORS[slice.category]}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{
              opacity: showFinal ? 1 : 0,
              scale: showFinal ? 1 : 0.92,
            }}
            style={{ transformOrigin: `${geometry.cx}px ${geometry.cy}px` }}
            transition={{
              duration: 0.4,
              delay: reduceMotion ? 0 : index * 0.06,
              ease: EASE,
            }}
          />
        ))}
      </svg>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        aria-hidden
      >
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
          Gesamt
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tabular-nums tracking-[-0.03em] text-[color:var(--vd-text)]">
          {formatEur(chart.grandTotal)}
        </p>
      </div>
    </div>
  );
}

function CategoryBreakdownList({ chart }: { chart: OperatingCostChartData }) {
  if (chart.categorySlices.length === 0) {
    return (
      <p className="text-center text-[0.82rem] text-[color:var(--vd-muted)]">
        Noch keine Ausgaben im gewählten Zeitraum.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {chart.categorySlices.map((slice) => (
        <li
          key={slice.category}
          className="flex items-center justify-between gap-3 border-b border-[color:var(--vd-border)]/60 pb-2.5 last:border-0 last:pb-0"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: OPERATING_COST_CATEGORY_COLORS[slice.category],
              }}
              aria-hidden
            />
            <span className="truncate text-[0.88rem] font-medium text-[color:var(--vd-text)]">
              {OPERATING_COST_CATEGORY_LABELS[slice.category]}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.88rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
              {formatEur(slice.amount)}
            </p>
            <p className="text-[0.72rem] tabular-nums text-[color:var(--vd-muted)]">
              {Math.round(slice.share * 100)} %
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OperatingCostDetailCharts({ chart }: OperatingCostDetailChartsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-40px 0px" });
  const reduceMotion = useReducedMotion();
  const showFinal = reduceMotion ? true : inView;
  const empty = chart.grandTotal <= 0;

  return (
    <section ref={sectionRef} className="space-y-4">
      <div className="zt-feature-panel space-y-3 p-4">
        <h2 className="text-[0.78rem] font-semibold text-[color:var(--vd-text)]">
          Alle Fahrzeugkosten nach Monat
        </h2>
        <p className="text-[0.72rem] leading-snug text-[color:var(--vd-muted)]">
          Letzte {chart.windowMonths} Monate · Tanken, Versicherung, Steuer & Sonstiges
        </p>
        {empty ? (
          <p className="py-8 text-center text-[0.82rem] text-[color:var(--vd-muted)]">
            Sobald du Kosten erfasst hast, siehst du hier die Monatsverteilung.
          </p>
        ) : (
          <>
            <MonthlyStackedChart
              chart={chart}
              showFinal={showFinal}
              reduceMotion={!!reduceMotion}
            />
            <ChartLegend />
          </>
        )}
      </div>

      <div className="zt-feature-panel space-y-4 p-4">
        <h2 className="text-[0.78rem] font-semibold text-[color:var(--vd-text)]">
          Kosten nach Kategorie
        </h2>
        <p className="text-[0.72rem] text-[color:var(--vd-muted)]">
          Alle erfassten Ausgaben im Zeitraum
        </p>
        {!empty ? (
          <CategoryDonutChart
            chart={chart}
            showFinal={showFinal}
            reduceMotion={!!reduceMotion}
          />
        ) : null}
        <CategoryBreakdownList chart={chart} />
      </div>
    </section>
  );
}
