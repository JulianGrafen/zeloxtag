"use client";

import type {
  PublicModification,
  PublicShowcaseB2bPartner,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";

import { EngineStartButton } from "./EngineStartButton";
import { ShowroomDyno } from "./ShowroomDyno";
import { ShowroomGroup } from "./ShowroomGroup";
import { ShowroomMods } from "./ShowroomMods";
import { showroom } from "./showroom-styles";

type ShowroomShowcaseMediaProps = {
  profile: PublicShowcaseProfile;
  modifications: PublicModification[];
  partnerBranding?: PublicShowcaseB2bPartner | null;
  playbackError: string | null;
  onPlaybackError: (message: string) => void;
};

/**
 * Soundcheck, Umbauten and dyno chart in one grouped block — same rhythm as
 * garage showcase settings (IOS grouped list).
 */
export function ShowroomShowcaseMedia({
  profile,
  modifications,
  partnerBranding = null,
  playbackError,
  onPlaybackError,
}: ShowroomShowcaseMediaProps) {
  const hasSoundcheck = Boolean(profile.engineSoundUrl?.trim());
  const hasModsSection = modifications.length > 0;
  const hasDyno = Boolean(profile.dynoChartUrl);

  if (!hasSoundcheck && !hasModsSection && !hasDyno) {
    return null;
  }

  return (
    <div>
      <h2 className={showroom.sectionLabel}>Showcase</h2>
      <ShowroomGroup>
        {hasSoundcheck ? (
          <EngineStartButton
            soundUrl={profile.engineSoundUrl}
            embedded
            onPlaybackError={onPlaybackError}
          />
        ) : null}
        {hasModsSection ? (
          <ShowroomMods
            modifications={modifications}
            partnerBranding={partnerBranding}
            embedded
          />
        ) : null}
        {hasDyno ? <ShowroomDyno profile={profile} embedded /> : null}
      </ShowroomGroup>
      {playbackError ? (
        <p
          className="mt-2 px-1 text-[0.82rem] font-medium text-red-400"
          role="alert"
        >
          {playbackError}
        </p>
      ) : null}
    </div>
  );
}
