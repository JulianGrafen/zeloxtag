"use client";

import { motion } from "framer-motion";
import type { PointerEvent as ReactPointerEvent } from "react";

import { EngineSoundWaveform } from "@/components/audio/engine-sound-waveform";
import { useAudioWaveformLevels } from "@/hooks/use-audio-waveform-levels";
import { useEngineSound } from "@/hooks/use-engine-sound";
import { useHoldEngineSound } from "@/hooks/use-hold-engine-sound";
import { playWebHapticTap } from "@/lib/ui/web-haptics";
import { cn } from "@/lib/utils";

import { useShowroomMotion } from "./showroom-motion";
import { showroom } from "./showroom-styles";

const DEFAULT_HOLD_IDLE_LABEL = "Gedrückt halten für Soundcheck";
const DEFAULT_HOLD_ACTIVE_LABEL = "Motor aktiv…";

type EngineStartButtonProps = {
  soundUrl: string | null;
  variant?: "toggle" | "hold";
  /** When true, show a disabled control if no sound is configured. */
  showMissingHint?: boolean;
  /** Renders as a row inside a ShowroomGroup (toggle variant only). */
  embedded?: boolean;
  className?: string;
  onPlaybackError?: (message: string) => void;
  holdIdleLabel?: string;
  holdActiveLabel?: string;
};

export function EngineStartButton({
  soundUrl,
  variant = "toggle",
  showMissingHint = false,
  embedded = false,
  className,
  onPlaybackError,
  holdIdleLabel = DEFAULT_HOLD_IDLE_LABEL,
  holdActiveLabel = DEFAULT_HOLD_ACTIVE_LABEL,
}: EngineStartButtonProps) {
  const hasSound = Boolean(soundUrl?.trim());

  if (!hasSound) {
    if (!showMissingHint) return null;
    return (
      <div className={cn("px-4 py-3.5 text-center", className)}>
        <p className={showroom.rowLabel}>Soundcheck</p>
        <p className={`mt-2 ${showroom.body}`}>Kein Soundcheck hinterlegt</p>
      </div>
    );
  }

  if (variant === "hold") {
    return (
      <EngineStartHoldButton
        soundUrl={soundUrl!}
        className={className}
        onPlaybackError={onPlaybackError}
        holdIdleLabel={holdIdleLabel}
        holdActiveLabel={holdActiveLabel}
      />
    );
  }

  return (
    <EngineStartToggleButton
      soundUrl={soundUrl!}
      embedded={embedded}
      className={className}
      onPlaybackError={onPlaybackError}
    />
  );
}

type EngineStartToggleButtonProps = {
  soundUrl: string;
  embedded: boolean;
  className?: string;
  onPlaybackError?: (message: string) => void;
};

function EngineStartToggleButton({
  soundUrl,
  embedded,
  className,
  onPlaybackError,
}: EngineStartToggleButtonProps) {
  const motionConfig = useShowroomMotion();
  const {
    audioRef,
    isPlaying,
    togglePlayback,
    handleAudioEnded,
    handleAudioError,
  } = useEngineSound({
    soundUrl,
    onPlaybackError,
  });

  const actionLabel = isPlaying ? "Stoppen" : "Motor starten";
  const waveformLevels = useAudioWaveformLevels(audioRef, isPlaying);

  function handleToggle() {
    playWebHapticTap();
    togglePlayback();
  }

  return (
    <div className={cn("pointer-events-auto relative w-full", className)}>
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        src={soundUrl}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          embedded
            ? cn(showroom.disclosureRow, "flex-col items-stretch gap-2.5 py-3.5", isPlaying && "bg-white/[0.04]")
            : cn(
                showroom.panelFlat,
                "flex w-full flex-col gap-3 px-4 py-3.5 text-left",
              ),
          "transition-colors active:scale-[0.99] active:bg-white/5",
          !embedded && "hover:bg-white/[0.05]",
          isPlaying && !embedded && "border-white/25 bg-white/[0.06]",
        )}
        aria-pressed={isPlaying}
        aria-label={embedded ? `Soundcheck, ${actionLabel}` : actionLabel}
      >
        <EngineSoundWaveform levels={waveformLevels} isPlaying={isPlaying} />
        <span className="flex w-full items-center justify-between gap-3">
          <span className="min-w-0 text-left">
            {embedded ? (
              <span className={showroom.listTitle}>Soundcheck</span>
            ) : (
              <>
                <span className={`block ${showroom.rowLabel}`}>Soundcheck</span>
                <span className="mt-0.5 block text-[0.94rem] font-medium text-white">
                  {actionLabel}
                </span>
              </>
            )}
          </span>
          <span
            className={cn(
              "shrink-0 text-[0.78rem] font-medium tabular-nums tracking-wide",
              isPlaying ? "text-emerald-400/90" : "text-white/40",
            )}
          >
            {isPlaying ? "LIVE" : "TAP"}
          </span>
        </span>
      </button>
      {embedded && isPlaying && !motionConfig.reduceMotion ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-0 h-px origin-left bg-emerald-400/35"
          initial={{ scaleX: 0.15, opacity: 0.35 }}
          animate={{ scaleX: [0.15, 1, 0.35], opacity: [0.35, 0.75, 0.45] }}
          transition={{
            duration: 1.4,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      ) : embedded && isPlaying ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-emerald-400/35"
        />
      ) : null}
    </div>
  );
}

type EngineStartHoldButtonProps = {
  soundUrl: string;
  className?: string;
  onPlaybackError?: (message: string) => void;
  holdIdleLabel: string;
  holdActiveLabel: string;
};

function EngineStartHoldButton({
  soundUrl,
  className,
  onPlaybackError,
  holdIdleLabel,
  holdActiveLabel,
}: EngineStartHoldButtonProps) {
  const motionConfig = useShowroomMotion();
  const {
    audioRef,
    isActive,
    startHold,
    endHold,
    handleAudioEnded,
    handleAudioError,
  } = useHoldEngineSound({
    soundUrl,
    onPlaybackError,
  });

  const caption = isActive ? holdActiveLabel : holdIdleLabel;
  const waveformLevels = useAudioWaveformLevels(audioRef, isActive);

  function handleHoldStart(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    playWebHapticTap();
    startHold();
  }

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur",
        className,
      )}
    >
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        src={soundUrl}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        className="hidden"
      />
      <div className="flex w-full flex-col items-center gap-3">
        <EngineSoundWaveform
          className="max-w-[14rem] px-1"
          levels={waveformLevels}
          isPlaying={isActive}
        />
        <div className="relative flex items-center justify-center">
          {isActive && !motionConfig.reduceMotion ? (
            <span
              aria-hidden
              className="absolute h-[5.25rem] w-[5.25rem] animate-ping rounded-full bg-red-500/25"
            />
          ) : null}
          {isActive ? (
            <span
              aria-hidden
              className="absolute h-[4.75rem] w-[4.75rem] rounded-full shadow-[0_0_18px_rgba(239,68,68,0.45)] ring-2 ring-red-500/50"
            />
          ) : null}
          <button
            type="button"
            className={cn(
              "relative z-10 flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center gap-1 rounded-full border border-neutral-700/80 bg-gradient-to-b from-neutral-800 to-neutral-950 text-center shadow-inner transition-transform duration-150",
              "select-none touch-none [-webkit-touch-callout:none]",
              isActive && "scale-95 border-neutral-600",
            )}
            style={{ touchAction: "none" }}
            aria-pressed={isActive}
            aria-label="Engine Start Stop Soundcheck"
            onPointerDown={handleHoldStart}
            onPointerUp={(event) => {
              event.preventDefault();
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              endHold();
            }}
            onPointerLeave={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                endHold();
              }
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              endHold();
            }}
            onContextMenu={(event) => event.preventDefault()}
            onTouchStart={(event) => event.preventDefault()}
          >
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-150",
                isActive
                  ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                  : "bg-neutral-500/70",
              )}
            />
            <span className="max-w-[3.25rem] text-[0.45rem] font-semibold uppercase leading-tight tracking-[0.08em] text-neutral-300">
              Engine
              <br />
              Start / Stop
            </span>
          </button>
        </div>
        <p className="min-h-[2.5rem] text-center text-[0.82rem] leading-snug text-neutral-400 transition-colors">
          {caption}
        </p>
      </div>
    </div>
  );
}
