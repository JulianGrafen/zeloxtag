"use client";

import { useMemo } from "react";

import type { CostYearlyPoint } from "@/lib/documents/cost-overview";

type CostOverviewChartProps = {
  series: CostYearlyPoint[];
  className?: string;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;
const PAD_X = 8;
const PAD_Y = 28;

export function CostOverviewChart({ series, className }: CostOverviewChartProps) {
  const geometry = useMemo(() => {
    if (series.length === 0) return null;

    const maxAmount = Math.max(...series.map((p) => p.amount), 1);
    const innerW = CHART_WIDTH - PAD_X * 2;
    const innerH = CHART_HEIGHT - PAD_Y - 12;

    const points = series.map((point, index) => {
      const x =
        series.length === 1
          ? CHART_WIDTH / 2
          : PAD_X + (innerW * index) / (series.length - 1);
      const y = PAD_Y + innerH - (point.amount / maxAmount) * innerH;
      return { ...point, x, y };
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(PAD_Y + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD_Y + innerH).toFixed(1)} Z`;

    return { points, linePath, areaPath, maxAmount };
  }, [series]);

  if (!geometry || series.length === 0) {
    return (
      <p className="text-[0.85rem] text-[color:var(--vd-muted)]">
        Noch keine Jahresdaten für den Verlauf.
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className={className ?? "h-auto w-full"}
      role="img"
      aria-label="Investition nach Jahr"
    >
      <defs>
        <linearGradient id="costChartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--vd-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--vd-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={geometry.areaPath} fill="url(#costChartFill)" />

      <path
        d={geometry.linePath}
        fill="none"
        stroke="var(--vd-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {geometry.points.map((point) => (
        <g key={point.year}>
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
            y={point.y - 10}
            textAnchor="middle"
            className="fill-[color:var(--vd-text)] text-[9px] font-semibold"
          >
            {point.amount.toLocaleString("de-DE")} €
          </text>
          <text
            x={point.x}
            y={CHART_HEIGHT - 6}
            textAnchor="middle"
            className="fill-[color:var(--vd-muted)] text-[9px] font-medium"
          >
            {point.year}
          </text>
        </g>
      ))}
    </svg>
  );
}
