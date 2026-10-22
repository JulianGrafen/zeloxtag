"use client";

import type { PublicShowcaseB2bPartner } from "@/lib/vehicles/public-showcase-data";

import { EngineStartButton } from "./EngineStartButton";
import { showroom } from "./showroom-styles";

type ShowroomEngineSoundcheckProps = {
  soundUrl: string;
  partnerBranding?: PublicShowcaseB2bPartner | null;
  onPlaybackError?: (message: string) => void;
};

function resolveHoldActiveLabel(
  partner: PublicShowcaseB2bPartner | null | undefined,
): string {
  const name = partner?.name?.trim();
  if (name) {
    return `${name} OPF-Abgasanlage aktiv…`;
  }
  return "Motor aktiv…";
}

export function ShowroomEngineSoundcheck({
  soundUrl,
  partnerBranding = null,
  onPlaybackError,
}: ShowroomEngineSoundcheckProps) {
  return (
    <div>
      <h2 className={showroom.sectionLabel}>Soundcheck</h2>
      <EngineStartButton
        variant="hold"
        soundUrl={soundUrl}
        holdActiveLabel={resolveHoldActiveLabel(partnerBranding)}
        onPlaybackError={onPlaybackError}
      />
    </div>
  );
}
