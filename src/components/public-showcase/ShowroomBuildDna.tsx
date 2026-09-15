"use client";

import { motion } from "framer-motion";

import {
  orderedRadarScores,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";

import { ShowroomRevealItem } from "./ShowroomRevealItem";
import { useShowroomMotion } from "./showroom-motion";
import { showroom } from "./showroom-styles";

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 88;
const GRID_LEVELS = [0.25, 0.5, 0.75, 1];

const AXIS_LABEL_OFFSET = 14;

const GRID_STROKE = "rgba(255,255,255,0.28)";
const AXIS_STROKE = "rgba(255,255,255,0.32)";
const SHAPE_FILL = "rgba(255,255,255,0.18)";
const SHAPE_STROKE = "rgba(255,255,255,0.92)";

type ShowroomBuildDnaProps = {
  dna: ShowcaseBuildDna;
};

function axisAngle(index: number): number {
  return (index * Math.PI) / 2 - Math.PI / 2;
}

function polarPoint(index: number, radius: number): { x: number; y: number } {
  const angle = axisAngle(index);
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  };
}

function polygonPoints(scores: number[]): string {
  return scores
    .map((score, index) => {
      const r = (Math.min(100, Math.max(0, score)) / 100) * MAX_R;
      const { x, y } = polarPoint(index, r);
      return `${x},${y}`;
    })
    .join(" ");
}

function gridPolygon(level: number): string {
  const r = level * MAX_R;
  return [0, 1, 2, 3]
    .map((index) => {
      const angle = axisAngle(index);
      return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
    })
    .join(" ");
}

const CATEGORY_LABELS: Record<string, string> = {
  Power: "Power",
  Handling: "Handling",
  Style: "Style",
  Reliability: "Reliability",
};

export function ShowroomBuildDna({ dna }: ShowroomBuildDnaProps) {
  const motionConfig = useShowroomMotion();
  const radar = orderedRadarScores(dna);
  const scores = radar.map((row) => row.score);

  return (
    <motion.section
      className="relative z-10 px-4"
      variants={motionConfig.staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={motionConfig.viewport}
    >
      <ShowroomRevealItem>
        <div className={showroom.panelFlat}>
          <div className="px-4 pb-5 pt-4">
            <p className={showroom.sectionLabel}>Build DNA</p>
            <h2 className="text-center text-[1.05rem] font-semibold tracking-tight text-white">
              {dna.archetype}
            </h2>
            <div className="mx-auto mt-4 max-w-[260px] overflow-visible">
              <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="h-auto w-full overflow-visible"
                role="img"
                aria-label={`Build DNA Radar: ${dna.archetype}`}
              >
                <g
                  fill="none"
                  stroke={GRID_STROKE}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                >
                  {GRID_LEVELS.map((level) => (
                    <polygon key={level} points={gridPolygon(level)} />
                  ))}
                </g>
                <g
                  stroke={AXIS_STROKE}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                >
                  {[0, 1, 2, 3].map((index) => {
                    const end = polarPoint(index, MAX_R);
                    return (
                      <line
                        key={index}
                        x1={CX}
                        y1={CY}
                        x2={end.x}
                        y2={end.y}
                      />
                    );
                  })}
                </g>
                <motion.g
                  initial={motionConfig.reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <polygon
                    points={polygonPoints(scores)}
                    fill={SHAPE_FILL}
                    stroke={SHAPE_STROKE}
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {radar.map((row, index) => {
                    const vertex = polarPoint(
                      index,
                      (Math.min(100, Math.max(0, row.score)) / 100) * MAX_R,
                    );
                    return (
                      <circle
                        key={`${row.category}-vertex`}
                        cx={vertex.x}
                        cy={vertex.y}
                        r={3}
                        fill={SHAPE_STROKE}
                      />
                    );
                  })}
                </motion.g>
                {radar.map((row, index) => {
                  const labelPos = polarPoint(index, MAX_R + AXIS_LABEL_OFFSET);
                  return (
                    <text
                      key={row.category}
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.55)"
                      fontSize={9}
                      fontWeight={500}
                      style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
                    >
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </text>
                  );
                })}
              </svg>
            </div>
            <p className={`mt-3 text-center ${showroom.body} text-white/65`}>
              {dna.punchline}
            </p>
          </div>
        </div>
      </ShowroomRevealItem>
    </motion.section>
  );
}
