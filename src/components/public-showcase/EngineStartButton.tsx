"use client";

import { useEngineSound } from "@/hooks/use-engine-sound";
import { cn } from "@/lib/utils";

type EngineStartButtonProps = {
  soundUrl: string | null;
  /** When true, show a disabled control if no sound is configured. */
  showMissingHint?: boolean;
  className?: string;
};

export function EngineStartButton({
  soundUrl,
  showMissingHint = false,
  className,
}: EngineStartButtonProps) {
  const hasSound = Boolean(soundUrl?.trim());
  const { audioRef, isPlaying, togglePlayback, handleAudioEnded } =
    useEngineSound({ soundUrl: hasSound ? soundUrl : null });

  if (!hasSound) {
    if (!showMissingHint) return null;
    return (
      <div
        className={cn(
          "pointer-events-auto mt-5 w-full max-w-md rounded-2xl border border-white/15 bg-black/50 px-4 py-4 text-center backdrop-blur-md",
          className,
        )}
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/45">
          Engine soundcheck
        </p>
        <p className="mt-2 text-[0.82rem] font-medium text-white/55">
          Kein Soundcheck hinterlegt
        </p>
      </div>
    );
  }

  const label = isPlaying ? "Soundcheck stoppen" : "Motor starten";

  return (
    <div className={cn("pointer-events-auto mt-5 w-full max-w-md", className)}>
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
          "group relative flex w-full items-center gap-4 rounded-2xl border border-white/20 bg-gradient-to-b from-zinc-800 to-zinc-950 px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45)] transition-transform active:scale-[0.98]",
          isPlaying && "border-emerald-500/35",
        )}
        aria-pressed={isPlaying}
        aria-label={label}
      >
        <span
          aria-hidden
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/40 bg-zinc-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.65)]",
            "before:absolute before:inset-[3px] before:rounded-full before:bg-gradient-to-b before:from-zinc-700 before:to-zinc-900",
          )}
        >
          <span
            className={cn(
              "relative z-10 h-2.5 w-2.5 rounded-full",
              isPlaying
                ? "bg-emerald-500 animate-pulse text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.85)]"
                : "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]",
            )}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/50">
            Soundcheck
          </span>
          <span className="mt-1 block text-[0.78rem] font-bold uppercase tracking-[0.08em] text-white sm:text-[0.82rem]">
            {label}
          </span>
        </span>
      </button>
    </div>
  );
}
