"use client";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { EngineStartButton } from "./EngineStartButton";

type ShowroomSoundcheckProps = {
  profile: PublicShowcaseProfile;
};

export function ShowroomSoundcheck({ profile }: ShowroomSoundcheckProps) {
  if (!profile.engineSoundUrl?.trim()) return null;

  return (
    <section className="-mt-3 px-4" aria-label="Motor-Soundcheck">
      <EngineStartButton
        soundUrl={profile.engineSoundUrl}
        className="mt-0 w-full max-w-none"
      />
    </section>
  );
}
