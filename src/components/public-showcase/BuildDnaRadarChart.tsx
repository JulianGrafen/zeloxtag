"use client";

import { motion } from "framer-motion";

import {
  BUILD_DNA_RADAR_AXIS_COUNT,
  orderedRadarScores,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";

const GRID_STROKE = "rgba(255,255,255,0.28)";
const AXIS_STROKE = "rgba(255,255,255,0.32)";
const SHAPE_FILL = "rgba(255,255,255,0.18)";
const SHAPE_STROKE = "rgba(255,255,255,0.92)";

type BuildDnaRadarChartProps = {
  dna: ShowcaseBuildDna;
  variant?: "default" | "compact";
  animate?: boolean;
  reduceMotion?: boolean;
  className?: string;
};

function chartMetrics(variant: "default" | "compact") {
  if (variant === "compact") {
    return {
      size: 168,
      maxR: 58,
      labelOffset: 11,
      labelFontSize: 7,
      showScoreLegend: false,
      showVertexScores: true,
    };
  }
  return {
    size: 260,
    maxR: 92,
    labelOffset: 16,
    labelFontSize: 8.5,
    showScoreLegend: true,
    showVertexScores: false,
  };
}

function axisAngle(index: number, axisCount: number): number {
  return (index * (2 * Math.PI)) / axisCount - Math.PI / 2;
}

function polarPoint(
  index: number,
  radius: number,
  cx: number,
  cy: number,
  axisCount: number,
): { x: number; y: number } {
  const angle = axisAngle(index, axisCount);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function polygonPoints(
  scores: number[],
  maxR: number,
  cx: number,
  cy: number,
  axisCount: number,
): string {
  return scores
    .map((score, index) => {
      const r = (Math.min(100, Math.max(0, score)) / 100) * maxR;
      const { x, y } = polarPoint(index, r, cx, cy, axisCount);
      return `${x},${y}`;
    })
    .join(" ");
}

function gridPolygon(
  level: number,
  maxR: number,
  cx: number,
  cy: number,
  axisCount: number,
): string {
  const r = level * maxR;
  return Array.from({ length: axisCount }, (_, index) => {
    const angle = axisAngle(index, axisCount);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

function shortCategoryLabel(category: string, compact: boolean): string {
  if (!compact) return category;
  if (category === "Straßenlage") return "Straße";
  if (category === "Haltbarkeit") return "Haltb.";
  return category;
}

export function BuildDnaRadarChart({
  dna,
  variant = "default",
  animate = true,
  reduceMotion = false,
  className,
}: BuildDnaRadarChartProps) {
  const metrics = chartMetrics(variant);
  const axisCount = BUILD_DNA_RADAR_AXIS_COUNT;
  const cx = metrics.size / 2;
  const cy = metrics.size / 2;
  const radar = orderedRadarScores(dna);
  const scores = radar.map((row) => row.score);
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${metrics.size} ${metrics.size}`}
        className="mx-auto h-auto w-full max-w-full overflow-visible"
        role="img"
        aria-label={`Umbau-DNA Radar: ${dna.archetype}`}
      >
        <g
          fill="none"
          stroke={GRID_STROKE}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        >
          {gridLevels.map((level) => (
            <polygon
              key={level}
              points={gridPolygon(level, metrics.maxR, cx, cy, axisCount)}
            />
          ))}
        </g>
        <g
          stroke={AXIS_STROKE}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        >
          {Array.from({ length: axisCount }, (_, index) => {
            const end = polarPoint(index, metrics.maxR, cx, cy, axisCount);
            return (
              <line key={index} x1={cx} y1={cy} x2={end.x} y2={end.y} />
            );
          })}
        </g>
        <motion.g
          initial={animate && !reduceMotion ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <polygon
            points={polygonPoints(scores, metrics.maxR, cx, cy, axisCount)}
            fill={SHAPE_FILL}
            stroke={SHAPE_STROKE}
            strokeWidth={1.75}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {radar.map((row, index) => {
            const vertex = polarPoint(
              index,
              (Math.min(100, Math.max(0, row.score)) / 100) * metrics.maxR,
              cx,
              cy,
              axisCount,
            );
            return (
              <circle
                key={`${row.category}-vertex`}
                cx={vertex.x}
                cy={vertex.y}
                r={variant === "compact" ? 2.5 : 3}
                fill={SHAPE_STROKE}
              />
            );
          })}
        </motion.g>
        {radar.map((row, index) => {
          const labelPos = polarPoint(
            index,
            metrics.maxR + metrics.labelOffset,
            cx,
            cy,
            axisCount,
          );
          return (
            <text
              key={row.category}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.55)"
              fontSize={metrics.labelFontSize}
              fontWeight={500}
              style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {shortCategoryLabel(row.category, variant === "compact")}
            </text>
          );
        })}
        {metrics.showVertexScores
          ? radar.map((row, index) => {
              const vertex = polarPoint(
                index,
                (Math.min(100, Math.max(0, row.score)) / 100) * metrics.maxR,
                cx,
                cy,
                axisCount,
              );
              return (
                <text
                  key={`${row.category}-score`}
                  x={vertex.x}
                  y={vertex.y - 6}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.75)"
                  fontSize={6}
                  fontWeight={600}
                >
                  {row.score}
                </text>
              );
            })
          : null}
      </svg>
      {metrics.showScoreLegend ? (
        <ul
          className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.72rem] text-white/60"
          aria-label="Radar-Werte"
        >
          {radar.map((row) => (
            <li key={row.category} className="flex justify-between gap-2">
              <span>{row.category}</span>
              <span className="font-medium tabular-nums text-white/85">
                {row.score}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
