"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import type {
  PublicModification,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";

import CountUp from "./CountUp";
import { EngineStartButton } from "./EngineStartButton";
import { ShowroomDyno } from "./ShowroomDyno";
import { ShowroomGroup } from "./ShowroomGroup";
import { ShowroomMods } from "./ShowroomMods";
import { ShowroomRevealItem } from "./ShowroomRevealItem";
import { ShowroomSpecRow } from "./ShowroomSpecRow";
import { buildShowcaseSpecRows } from "./showcase-spec-rows";
import { useShowroomMotion } from "./showroom-motion";
import { showroom } from "./showroom-styles";

type ShowroomStatsProps = {
  profile: PublicShowcaseProfile;
  modifications: PublicModification[];
};

function animatedStatValue(
  amount: number | null | undefined,
  unit: string,
): ReactNode {
  if (amount == null || !Number.isFinite(amount)) return null;
  return (
    <>
      <CountUp
        from={0}
        to={amount}
        separator=","
        direction="up"
        duration={1.7}
        className="count-up-text"
        delay={0}
      />{" "}
      {unit}
    </>
  );
}

export function ShowroomStats({ profile, modifications }: ShowroomStatsProps) {
  const motionConfig = useShowroomMotion();
  const vehicleRows = buildShowcaseSpecRows(profile, animatedStatValue);
  const hasSoundcheck = Boolean(profile.engineSoundUrl?.trim());
  const hasModsSection = modifications.length > 0;
  const hasDyno = Boolean(profile.dynoChartUrl);
  const hasShowcaseGroup = hasSoundcheck || hasModsSection || hasDyno;

  if (vehicleRows.length === 0 && !hasShowcaseGroup) {
    return null;
  }

  return (
    <motion.section
      className="relative z-10 flex flex-col gap-6 px-4"
      variants={motionConfig.staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={motionConfig.viewport}
    >
      {vehicleRows.length > 0 ? (
        <ShowroomRevealItem>
          <div>
            <h2 className={showroom.sectionLabel}>Fahrzeugdaten</h2>
            <motion.div
              variants={motionConfig.rowRevealContainer}
              initial="hidden"
              whileInView="visible"
              viewport={motionConfig.viewport}
            >
              <ShowroomGroup>
                {vehicleRows.map((row) => (
                  <motion.div
                    key={row.key}
                    variants={motionConfig.rowRevealItem}
                  >
                    <ShowroomSpecRow
                      label={row.label}
                      value={row.value}
                      emphasis={row.emphasis}
                      layout={row.layout}
                    />
                  </motion.div>
                ))}
              </ShowroomGroup>
            </motion.div>
          </div>
        </ShowroomRevealItem>
      ) : null}

      {hasShowcaseGroup ? (
        <ShowroomRevealItem>
          <div className="flex flex-col gap-4">
              {hasSoundcheck ? (
                <ShowroomGroup accent>
                  <EngineStartButton
                    soundUrl={profile.engineSoundUrl}
                    embedded
                  />
                </ShowroomGroup>
              ) : null}
              {hasModsSection ? (
                <ShowroomGroup>
                  <ShowroomMods modifications={modifications} embedded />
                </ShowroomGroup>
              ) : null}
              {hasDyno ? (
                <ShowroomGroup>
                  <ShowroomDyno profile={profile} embedded />
                </ShowroomGroup>
              ) : null}
          </div>
        </ShowroomRevealItem>
      ) : null}
    </motion.section>
  );
}
