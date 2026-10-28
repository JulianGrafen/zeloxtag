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
 * Umbauten and dyno chart in one grouped block — same rhythm as garage showcase
 * settings (IOS grouped list). Soundcheck lives above in ShowroomEngineSoundcheck.
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
    <div>
      <h2 className={showroom.sectionLabel}>Showcase</h2>
      <ShowroomGroup>
        {hasModsSection ? (
          <ShowroomMods
            modifications={modifications}
            partnerBranding={partnerBranding}
            embedded
            defaultOpen={modsDefaultOpen}
          />
        ) : null}
        {hasDyno ? <ShowroomDyno profile={profile} embedded /> : null}
      </ShowroomGroup>
    </div>
  );
}
