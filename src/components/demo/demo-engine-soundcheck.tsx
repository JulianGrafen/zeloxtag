"use client";

import { useState } from "react";

import { EngineStartButton } from "@/components/public-showcase/EngineStartButton";
import { DEMO_ENGINE_SOUND_URL } from "@/lib/tags/demo-showcase";
import { cn } from "@/lib/utils";

type DemoEngineSoundcheckProps = {
  className?: string;
};

/** Soundcheck row for the demo garage (same clip as public showcase). */
export function DemoEngineSoundcheck({ className }: DemoEngineSoundcheckProps) {
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  return (
    <div className={cn("mx-auto w-full max-w-lg px-4 sm:px-5", className)}>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[var(--vd-shadow-sm)]">
        <EngineStartButton
          soundUrl={DEMO_ENGINE_SOUND_URL}
          embedded
          onPlaybackError={setPlaybackError}
        />
        {playbackError ? (
          <p
            className="px-4 pb-3 text-[0.82rem] font-medium text-red-500"
            role="alert"
          >
            {playbackError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
