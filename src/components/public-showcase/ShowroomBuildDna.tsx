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
            <div className="mx-auto mt-4 max-w-[260px]">
              <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="h-auto w-full"
                role="img"
                aria-label={`Build DNA Radar: ${dna.archetype}`}
              >
                {GRID_LEVELS.map((level) => (
                  <polygon
                    key={level}
                    points={gridPolygon(level)}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={1}
                  />
                ))}
                {[0, 1, 2, 3].map((index) => {
                  const end = polarPoint(index, MAX_R);
                  return (
                    <line
                      key={index}
                      x1={CX}
                      y1={CY}
                      x2={end.x}
                      y2={end.y}
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth={1}
                    />
                  );
                })}
                <motion.polygon
                  points={polygonPoints(scores)}
                  fill="rgba(255,255,255,0.14)"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth={1.5}
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={motionConfig.viewport}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />
                {radar.map((row, index) => {
                  const labelPos = polarPoint(index, MAX_R + AXIS_LABEL_OFFSET);
                  return (
                    <text
                      key={row.category}
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white/50 text-[9px] font-medium uppercase tracking-[0.12em]"
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
