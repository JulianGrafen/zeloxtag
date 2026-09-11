"use client";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { EngineStartButton } from "./EngineStartButton";

type ShowroomSoundcheckProps = {
  profile: PublicShowcaseProfile;
};

/** Scrollable showcase CTA — complements the hero control on small viewports. */
export function ShowroomSoundcheck({ profile }: ShowroomSoundcheckProps) {
  if (!profile.engineSoundUrl?.trim()) return null;

  return (
    <section className="px-4" aria-label="Motor-Soundcheck">
      <EngineStartButton
        soundUrl={profile.engineSoundUrl}
        className="mt-0 max-w-none"
      />
    </section>
  );
}
