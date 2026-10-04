"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useId, useMemo, useRef } from "react";

import type { CostYearlyPoint } from "@/lib/documents/cost-overview";
import {
  buildYearlyBarChartGeometry,
  buildYearlyChartGeometry,
  COST_CHART_MAINTENANCE_COLOR,
  COST_CHART_MODIFICATION_COLOR,
  formatYearlyChartAmount,
  YEARLY_CHART_HEIGHT,
  YEARLY_CHART_PAD_TOP,
  YEARLY_CHART_WIDTH,
} from "@/lib/documents/cost-overview-chart";

export type CostOverviewChartMode = "line" | "bar";

type CostOverviewChartProps = {
  series: CostYearlyPoint[];
  mode: CostOverviewChartMode;
  className?: string;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const LINE_DURATION = 0.85;

/** Original Gesamt-Investition line + area (accent gradient). */
function InvestmentLineChart({
  series,
  reduceMotion,
  showFinal,
}: {
  series: CostYearlyPoint[];
  reduceMotion: boolean;
  showFinal: boolean;
}) {
  const clipSuffix = useId().replace(/:/g, "");
  const clipId = `costChartPlot-${clipSuffix}`;
  const gradientId = `costChartFill-${clipSuffix}`;

  const geometry = useMemo(
    () => buildYearlyChartGeometry(series, clipId),
    [series, clipId],
  );

  if (!geometry) return null;

  return (
    <svg
      viewBox={`0 0 ${YEARLY_CHART_WIDTH} ${YEARLY_CHART_HEIGHT}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Investition nach Jahr"
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={0}
            y={YEARLY_CHART_PAD_TOP - 4}
            width={YEARLY_CHART_WIDTH}
            height={geometry.plotBottom - YEARLY_CHART_PAD_TOP + 8}
          />
        </clipPath>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--vd-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--vd-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <motion.path
          d={geometry.areaPath}
          fill={`url(#${gradientId})`}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: showFinal ? 1 : 0 }}
          transition={{
            duration: 0.5,
            delay: reduceMotion ? 0 : LINE_DURATION * 0.35,
            ease: EASE_OUT,
          }}
        />

        <motion.path
          d={geometry.linePath}
          fill="none"
          stroke="var(--vd-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: showFinal ? 1 : 0 }}
          transition={{
            duration: reduceMotion ? 0 : LINE_DURATION,
            ease: EASE_OUT,
          }}
        />
      </g>

      {geometry.points.map((point, index) => (
        <motion.g
          key={point.year}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{
            opacity: showFinal ? 1 : 0,
            scale: showFinal ? 1 : 0.6,
          }}
          transition={{
            duration: 0.35,
            delay: reduceMotion
              ? 0
              : LINE_DURATION * 0.55 + index * 0.07,
            ease: EASE_OUT,
          }}
          style={{ transformOrigin: `${point.x}px ${point.y}px` }}
        >
          <circle
            cx={point.x}
            cy={point.y}
            r="4.5"
            fill="var(--vd-surface)"
            stroke="var(--vd-accent)"
            strokeWidth="2"
          />
          <text
            x={point.x}
            y={point.y - 12}
            textAnchor="middle"
            className="fill-[color:var(--vd-text)] text-[9px] font-semibold"
          >
            {formatYearlyChartAmount(point.amount)}
          </text>
          <text
            x={point.x}
            y={YEARLY_CHART_HEIGHT - 8}
            textAnchor="middle"
            className="fill-[color:var(--vd-muted)] text-[9px] font-medium"
          >
            {point.year}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

function BarChart({
  series,
  reduceMotion,
  showFinal,
}: {
  series: CostYearlyPoint[];
  reduceMotion: boolean;
  showFinal: boolean;
}) {
  const geometry = useMemo(() => buildYearlyBarChartGeometry(series), [series]);

  if (!geometry) return null;

  return (
    <svg
      viewBox={`0 0 ${YEARLY_CHART_WIDTH} ${YEARLY_CHART_HEIGHT}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Umbau- und Wartungskosten als Balkendiagramm"
    >
      {geometry.bars.map((bar, index) => {
        const fill =
          bar.kind === "modification"
            ? COST_CHART_MODIFICATION_COLOR
            : COST_CHART_MAINTENANCE_COLOR;
        const targetHeight = showFinal ? bar.height : 0;
        const targetY = geometry.plotBottom - targetHeight;

        return (
          <motion.g key={`${bar.year}-${bar.kind}`}>
            <motion.rect
              x={bar.x}
              width={bar.width}
              rx={4}
              fill={fill}
              initial={
                reduceMotion
                  ? { y: bar.y, height: bar.height }
                  : { y: geometry.plotBottom, height: 0 }
              }
              animate={{ y: targetY, height: targetHeight }}
              transition={{
                duration: reduceMotion ? 0 : 0.55,
                delay: reduceMotion ? 0 : index * 0.05,
                ease: EASE_OUT,
              }}
            />
            {showFinal && bar.height > 18 ? (
              <text
                x={bar.x + bar.width / 2}
                y={bar.y - 6}
                textAnchor="middle"
                className="fill-[color:var(--vd-text)] text-[8px] font-semibold"
              >
                {formatYearlyChartAmount(bar.amount)}
              </text>
            ) : null}
          </motion.g>
        );
      })}

      {geometry.groupCenters.map((group) => (
        <text
          key={group.year}
          x={group.x}
          y={YEARLY_CHART_HEIGHT - 8}
          textAnchor="middle"
          className="fill-[color:var(--vd-muted)] text-[9px] font-medium"
        >
          {group.year}
        </text>
      ))}
    </svg>
  );
}

export function CostOverviewChartLegend({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.72rem] font-medium text-[color:var(--vd-muted)] ${className ?? ""}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: COST_CHART_MODIFICATION_COLOR }}
          aria-hidden
        />
        Umbau
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: COST_CHART_MAINTENANCE_COLOR }}
          aria-hidden
        />
        Wartung
      </span>
    </div>
  );
}

export function CostOverviewChart({
  series,
  mode,
  className,
}: CostOverviewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const showFinal = reduceMotion || inView;

  const hasYearlyTotals = series.some((point) => point.amount > 0);
  const hasSplitData = series.some(
    (point) => point.modificationAmount > 0 || point.maintenanceAmount > 0,
  );

  if (series.length === 0) {
    return (
      <p className="text-[0.85rem] text-[color:var(--vd-muted)]">
        Noch keine Jahresdaten für den Verlauf.
      </p>
    );
  }

  if (mode === "bar" && !hasSplitData) {
    return (
      <p className="text-[0.85rem] text-[color:var(--vd-muted)]">
        Für Balken brauchst du erfasste Umbau- oder Wartungspositionen.
      </p>
    );
  }

  if (mode === "line" && !hasYearlyTotals) {
    return (
      <p className="text-[0.85rem] text-[color:var(--vd-muted)]">
        Noch keine Jahresdaten für den Verlauf.
      </p>
    );
  }

  return (
    <div ref={containerRef} className={className ?? "w-full"}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          {mode === "line" ? (
            <InvestmentLineChart
              series={series}
              reduceMotion={Boolean(reduceMotion)}
              showFinal={showFinal}
            />
          ) : (
            <BarChart
              series={series}
              reduceMotion={Boolean(reduceMotion)}
              showFinal={showFinal}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
