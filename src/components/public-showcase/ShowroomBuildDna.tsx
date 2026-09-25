"use client";

import { motion } from "framer-motion";

import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";

import { BuildDnaRadarChart } from "./BuildDnaRadarChart";
import { ShowroomRevealItem } from "./ShowroomRevealItem";
import { useShowroomMotion } from "./showroom-motion";
import { showroom } from "./showroom-styles";

type ShowroomBuildDnaProps = {
  dna: ShowcaseBuildDna;
};

export function ShowroomBuildDna({ dna }: ShowroomBuildDnaProps) {
  const motionConfig = useShowroomMotion();

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
            <p className={showroom.sectionLabel}>Umbau-DNA</p>
            <h2 className="text-center text-[1.05rem] font-semibold tracking-tight text-white">
              {dna.archetype}
            </h2>
            <div className="mx-auto mt-4 max-w-[280px] overflow-visible">
              <BuildDnaRadarChart
                dna={dna}
                animate={!motionConfig.reduceMotion}
                reduceMotion={motionConfig.reduceMotion}
              />
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
