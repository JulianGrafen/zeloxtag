"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";

import { InsetGroupedCard, InsetListRow, TelemetryValue } from "@/components/ui/ios";
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
  type OperatingCostCategory,
} from "@/lib/vehicles/operating-costs/types";
import { formatCurrencyEUR } from "@/utils/formatters";

import {
  OPERATING_COST_CATEGORY_ICONS,
  OPERATING_COST_CATEGORY_TONES,
} from "./operating-cost-category-visuals";

const EASE = [0.22, 1, 0.36, 1] as const;
const CHART_GRID_STROKE = "rgba(255,255,255,0.12)";
const CHART_LABEL_CLASS = "fill-[#8E8E93] text-[8px] font-medium";

type OperatingCostDetailChartsProps = {
  chart: OperatingCostChartData;
  categoryMonthlyAverages: Record<OperatingCostCategory, number>;
};

function ChartLegend() {
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-2 px-1">
      {OPERATING_COST_CATEGORIES.map((category) => (
        <li
          key={category}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#8E8E93]"
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
              stroke={CHART_GRID_STROKE}
              strokeWidth={1}
            />
            <text
              x={24}
              y={y + 3}
              textAnchor="end"
              className={CHART_LABEL_CLASS}
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
            className={CHART_LABEL_CLASS}
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
        <p className="text-[11px] font-medium text-[#8E8E93]">Gesamt</p>
        <TelemetryValue
          value={formatCurrencyEUR(chart.grandTotal)}
          className="mt-0.5 text-[17px] font-semibold"
        />
      </div>
    </div>
  );
}

function shareLabel(amount: number, grandTotal: number): string {
  const share = grandTotal > 0 ? amount / grandTotal : 0;
  return `${Math.round(share * 100).toLocaleString("de-DE")} %`;
}

function CategoryBreakdownRows({
  chart,
  categoryMonthlyAverages,
}: OperatingCostDetailChartsProps) {
  return OPERATING_COST_CATEGORIES.map((category) => {
    const amount = chart.categoryTotals[category];
    return (
      <InsetListRow
        key={category}
        emphasis="data"
        icon={OPERATING_COST_CATEGORY_ICONS[category]}
        iconTone={OPERATING_COST_CATEGORY_TONES[category]}
        label={OPERATING_COST_CATEGORY_LABELS[category]}
        sublabel={
          <span className="tabular-nums">
            ø {formatCurrencyEUR(categoryMonthlyAverages[category])}/M ·{" "}
            {shareLabel(amount, chart.grandTotal)}
          </span>
        }
        value={formatCurrencyEUR(amount)}
        valueVariant="numeric"
      />
    );
  });
}

export function OperatingCostDetailCharts({
  chart,
  categoryMonthlyAverages,
}: OperatingCostDetailChartsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-40px 0px" });
  const reduceMotion = useReducedMotion();
  const showFinal = reduceMotion ? true : inView;
  const empty = chart.grandTotal <= 0;

  return (
    <div ref={sectionRef} className="flex flex-col gap-6">
      <InsetGroupedCard
        header="Kosten nach Monat"
        footer={`Letzte ${chart.windowMonths} Monate · Tanken, Versicherung, Steuer & Sonstiges`}
        cardClassName="space-y-3 p-4"
      >
        {empty ? (
          <p className="py-6 text-center text-[15px] text-[#8E8E93]">
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
      </InsetGroupedCard>

      <InsetGroupedCard
        header="Kosten nach Kategorie"
        footer={
          empty
            ? "Noch keine Ausgaben im gewählten Zeitraum."
            : "Alle erfassten Ausgaben im Zeitraum"
        }
      >
        {!empty ? (
          <div className="px-4 pb-2 pt-4">
            <CategoryDonutChart
              chart={chart}
              showFinal={showFinal}
              reduceMotion={!!reduceMotion}
            />
          </div>
        ) : null}
        <CategoryBreakdownRows
          chart={chart}
          categoryMonthlyAverages={categoryMonthlyAverages}
        />
      </InsetGroupedCard>
    </div>
  );
}
