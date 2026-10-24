"use client";

import { cn } from "@/lib/utils";

type EngineSoundWaveformProps = {
  levels: number[];
  isPlaying: boolean;
  className?: string;
};

export function EngineSoundWaveform({
  levels,
  isPlaying,
  className,
}: EngineSoundWaveformProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-full items-end justify-center gap-[2px]",
        className,
      )}
      aria-hidden
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className={cn(
            "w-[2px] max-w-[3px] flex-1 rounded-full transition-[height,opacity] duration-75 ease-out",
            isPlaying
              ? "bg-gradient-to-t from-white/35 to-white/90"
              : "bg-white/25",
          )}
          style={{
            height: `${Math.round(18 + level * 72)}%`,
            opacity: isPlaying ? 0.55 + level * 0.45 : 0.45,
          }}
        />
      ))}
    </div>
  );
}
