"use client";

import type {
  PublicModification,
  PublicShowcaseB2bPartner,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";

import { ShowroomDyno } from "./ShowroomDyno";
import { ShowroomGroup } from "./ShowroomGroup";
import { ShowroomMods } from "./ShowroomMods";
import { showroom } from "./showroom-styles";

type ShowroomShowcaseMediaProps = {
  profile: PublicShowcaseProfile;
  modifications: PublicModification[];
  partnerBranding?: PublicShowcaseB2bPartner | null;
  modsDefaultOpen?: boolean;
};

/**
 * Umbauten carousel + optional dyno in a grouped block.
 * Soundcheck lives above in ShowroomEngineSoundcheck.
 */
export function ShowroomShowcaseMedia({
  profile,
  modifications,
  partnerBranding = null,
  modsDefaultOpen = false,
}: ShowroomShowcaseMediaProps) {
  const hasModsSection = modifications.length > 0;
  const hasDyno = Boolean(profile.dynoChartUrl);

  if (!hasModsSection && !hasDyno) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      {hasModsSection ? (
        <ShowroomMods
          modifications={modifications}
          partnerBranding={partnerBranding}
          embedded
          defaultShowAll={modsDefaultOpen}
        />
      ) : null}
      {hasDyno ? (
        <div>
          <h2 className={showroom.sectionLabel}>Showcase</h2>
          <ShowroomGroup>
            <ShowroomDyno profile={profile} embedded />
          </ShowroomGroup>
        </div>
      ) : null}
    </div>
  );
}
