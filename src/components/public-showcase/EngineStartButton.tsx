"use client";

import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";

import { useEngineSound } from "@/hooks/use-engine-sound";
import { cn } from "@/lib/utils";

import { useShowroomMotion } from "./showroom-motion";
import { showroom } from "./showroom-styles";

type EngineStartButtonProps = {
  soundUrl: string | null;
  /** When true, show a disabled control if no sound is configured. */
  showMissingHint?: boolean;
  /** Renders as a row inside a ShowroomGroup (public showcase). */
  embedded?: boolean;
  className?: string;
};

export function EngineStartButton({
  soundUrl,
  showMissingHint = false,
  embedded = false,
  className,
}: EngineStartButtonProps) {
  const hasSound = Boolean(soundUrl?.trim());
  const motionConfig = useShowroomMotion();
  const { audioRef, isPlaying, togglePlayback, handleAudioEnded } =
    useEngineSound({ soundUrl: hasSound ? soundUrl : null });

  if (!hasSound) {
    if (!showMissingHint) return null;
    return (
      <div className={cn("px-4 py-3.5 text-center", className)}>
        <p className={showroom.rowLabel}>Soundcheck</p>
        <p className={`mt-2 ${showroom.body}`}>Kein Soundcheck hinterlegt</p>
      </div>
    );
  }

  const actionLabel = isPlaying ? "Stoppen" : "Motor starten";
  const embeddedLabel = isPlaying ? "Stoppen" : "Soundcheck";

  return (
    <div className={cn("pointer-events-auto relative w-full", className)}>
      <audio
        ref={audioRef}
        preload="none"
        src={soundUrl ?? undefined}
        onEnded={handleAudioEnded}
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlayback}
        className={cn(
          embedded
            ? showroom.disclosureRow
            : cn(
                showroom.panelFlat,
                "flex min-h-[3.35rem] w-full items-center gap-3 px-4 py-3.5 text-left",
              ),
          "transition-colors active:scale-[0.99] active:bg-white/5",
          !embedded && "hover:bg-white/[0.05]",
          isPlaying && !embedded && "border-white/25 bg-white/[0.06]",
        )}
        aria-pressed={isPlaying}
        aria-label={embedded ? `Soundcheck, ${actionLabel}` : actionLabel}
      >
        <span aria-hidden className="flex shrink-0 text-white/80">
          {isPlaying ? (
            <Pause className="h-5 w-5" aria-hidden />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          {embedded ? (
            <span className="block text-[0.94rem] font-medium text-white">
              {embeddedLabel}
            </span>
          ) : (
            <>
              <span className={`block ${showroom.rowLabel}`}>Soundcheck</span>
              <span className="mt-0.5 block text-[0.94rem] font-medium text-white">
                {actionLabel}
              </span>
            </>
          )}
        </span>
        {!embedded ? (
          <span
            aria-hidden
            className={cn(
              "h-2 w-2 shrink-0 rounded-full transition-colors",
              isPlaying
                ? "animate-pulse bg-emerald-500"
                : "bg-red-500",
            )}
          />
        ) : null}
      </button>
      {embedded && isPlaying && !motionConfig.reduceMotion ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-0 h-px origin-left bg-white/30"
          initial={{ scaleX: 0.15, opacity: 0.4 }}
          animate={{ scaleX: [0.15, 1, 0.35], opacity: [0.4, 0.85, 0.5] }}
          transition={{
            duration: 1.4,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      ) : embedded && isPlaying ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-white/30"
        />
      ) : null}
    </div>
  );
}
