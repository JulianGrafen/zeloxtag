"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useId, useMemo, useRef } from "react";

import type { CostYearlyPoint } from "@/lib/documents/cost-overview";
import {
  buildYearlyChartGeometry,
  formatYearlyChartAmount,
  YEARLY_CHART_HEIGHT,
  YEARLY_CHART_PAD_TOP,
  YEARLY_CHART_WIDTH,
} from "@/lib/documents/cost-overview-chart";

type CostOverviewChartProps = {
  series: CostYearlyPoint[];
  className?: string;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const LINE_DURATION = 0.85;

export function CostOverviewChart({ series, className }: CostOverviewChartProps) {
  const clipSuffix = useId().replace(/:/g, "");
  const clipId = `costChartPlot-${clipSuffix}`;
  const gradientId = `costChartFill-${clipSuffix}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.4 });
  const reduceMotion = useReducedMotion();

  const geometry = useMemo(
    () => buildYearlyChartGeometry(series, clipId),
    [series, clipId],
  );

  const showFinal = reduceMotion || inView;

  if (!geometry || series.length === 0) {
    return (
      <p className="text-[0.85rem] text-[color:var(--vd-muted)]">
        Noch keine Jahresdaten für den Verlauf.
      </p>
    );
  }

  return (
    <div ref={containerRef} className={className ?? "w-full"}>
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
    </div>
  );
}
