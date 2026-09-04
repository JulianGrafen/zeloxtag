"use client";

import type { ShinePosition } from "@/lib/hooks/use-device-motion-shine";
import { cn } from "@/lib/utils";

export function MotionShineOverlay({
  position,
  selected,
  motionActive,
}: {
  position: ShinePosition;
  selected: boolean;
  motionActive: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-2xl",
        selected ? "opacity-100" : "opacity-70",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "absolute -inset-[120%] will-change-transform",
          motionActive ? "transition-none" : "",
        )}
        style={{
          background: `radial-gradient(circle at ${position.x}% ${position.y}%, rgba(255,255,255,0.55) 0%, rgba(191,219,254,0.28) 14%, transparent 42%)`,
        }}
      />
      <div
        className="absolute -inset-[120%] mix-blend-soft-light"
        style={{
          background: `linear-gradient(
            ${115 + (position.x - 50) * 0.35}deg,
            transparent 0%,
            transparent ${position.x - 18}%,
            rgba(255,255,255,0.65) ${position.x}%,
            rgba(147,197,253,0.35) ${position.x + 4}%,
            transparent ${position.x + 16}%,
            transparent 100%
          )`,
          transform: `translate(${(position.x - 50) * 0.35}%, ${(position.y - 50) * 0.35}%)`,
        }}
      />
    </div>
  );
}
