"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

import type {
  PublicModification,
  PublicShowcaseB2bPartner,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";
import { useRegionalFormatters } from "@/lib/i18n/hooks/use-regional-formatters";
import { cn } from "@/lib/utils";

import CountUp from "./CountUp";
import { ShowroomGroup } from "./ShowroomGroup";
import { ShowroomRevealItem } from "./ShowroomRevealItem";
import { ShowroomEngineSoundcheck } from "./ShowroomEngineSoundcheck";
import { ShowroomShowcaseMedia } from "./ShowroomShowcaseMedia";
import { ShowroomSpecRow } from "./ShowroomSpecRow";
import {
  buildShowcaseSpecificationRow,
  buildShowcaseSpecRows,
} from "./showcase-spec-rows";
import { useShowroomMotion } from "./showroom-motion";
import { showroom } from "./showroom-styles";

type ShowroomStatsProps = {
  profile: PublicShowcaseProfile;
  modifications: PublicModification[];
  partnerBranding?: PublicShowcaseB2bPartner | null;
  /** e.g. demo tab — do not wait for scroll intersection to reveal rows. */
  revealOnMount?: boolean;
};

function animatedStatValue(
  amount: number | null | undefined,
  unit: string,
  options?: { decimals?: number },
): ReactNode {
  if (amount == null || !Number.isFinite(amount)) return null;
  const decimals = options?.decimals ?? 0;
  const separator = decimals > 0 ? "" : ",";
  return (
    <>
      <CountUp
        from={0}
        to={amount}
        separator={separator}
        decimals={decimals}
        direction="up"
        duration={1.7}
        className="count-up-text"
        delay={0}
      />
      {unit ? ` ${unit}` : null}
    </>
  );
}

export function ShowroomStats({
  profile,
  modifications,
  partnerBranding = null,
  revealOnMount = false,
}: ShowroomStatsProps) {
  const motionConfig = useShowroomMotion();
  const { profile: regionalProfile } = useRegionalFormatters();
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const specificationRow = buildShowcaseSpecificationRow(profile);
  const vehicleRows = buildShowcaseSpecRows(
    profile,
    animatedStatValue,
    regionalProfile,
  );
  const hasEngineSound = Boolean(profile.engineSoundUrl?.trim());
  const hasShowcaseMedia =
    modifications.length > 0 || Boolean(profile.dynoChartUrl);

  if (
    vehicleRows.length === 0 &&
    !specificationRow &&
    !hasShowcaseMedia &&
    !hasEngineSound
  ) {
    return null;
  }

  const rowRevealMotion = revealOnMount
    ? { animate: "visible" as const }
    : {
        whileInView: "visible" as const,
        viewport: motionConfig.viewport,
      };

  return (
    <motion.section
      className="relative z-10 flex flex-col gap-6 px-4"
      variants={motionConfig.staggerContainer}
      initial="hidden"
      {...(revealOnMount
        ? { animate: "visible" }
        : {
            whileInView: "visible",
            viewport: motionConfig.viewport,
          })}
    >
      {specificationRow ? (
        <ShowroomRevealItem>
          <div>
            <h2 className={showroom.sectionLabel}>Spezifikation</h2>
            <ShowroomGroup>
              <div className="px-4 py-3.5">
                <div className={cn("min-w-0 whitespace-pre-wrap", showroom.body)}>
                  {specificationRow.value}
                </div>
              </div>
            </ShowroomGroup>
          </div>
        </ShowroomRevealItem>
      ) : null}

      {vehicleRows.length > 0 ? (
        <ShowroomRevealItem>
          <div>
            <h2 className={showroom.sectionLabel}>Fahrzeugdaten</h2>
            <motion.div
              variants={motionConfig.rowRevealContainer}
              initial="hidden"
              {...rowRevealMotion}
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
                      quartett={row.quartett}
                    />
                  </motion.div>
                ))}
              </ShowroomGroup>
            </motion.div>
          </div>
        </ShowroomRevealItem>
      ) : null}

      {hasEngineSound ? (
        <ShowroomRevealItem>
          <ShowroomEngineSoundcheck
            soundUrl={profile.engineSoundUrl!.trim()}
            partnerBranding={partnerBranding}
            onPlaybackError={setPlaybackError}
          />
        </ShowroomRevealItem>
      ) : null}

      {hasShowcaseMedia ? (
        <ShowroomRevealItem>
          <ShowroomShowcaseMedia
            profile={profile}
            modifications={modifications}
            partnerBranding={partnerBranding}
          />
        </ShowroomRevealItem>
      ) : null}

      {playbackError ? (
        <p
          className="px-1 text-[0.82rem] font-medium text-red-400"
          role="alert"
        >
          {playbackError}
        </p>
      ) : null}
    </motion.section>
  );
}
