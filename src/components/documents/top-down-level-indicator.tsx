"use client";

import type { TopDownTiltState } from "@/lib/hooks/use-top-down-tilt";

type TopDownLevelIndicatorProps = {
  tilt: TopDownTiltState;
  onRequestPermission?: () => void;
};

/**
 * Live bubble level for overhead document capture.
 * Green = phone held parallel above the document; amber/red = tilted.
 */
export function TopDownLevelIndicator({
  tilt,
  onRequestPermission,
}: TopDownLevelIndicatorProps) {
  if (!tilt.supported) return null;

  if (tilt.needsPermission && !tilt.active) {
    return (
      <div className="pointer-events-auto flex max-w-[17rem] flex-col items-center gap-2 text-center">
        <p className="text-[0.68rem] font-medium leading-snug text-white/90">
          Für bessere Bildqualität und Texterkennung: Handy parallel über das
          Blatt halten.
        </p>
        <button
          type="button"
          onClick={onRequestPermission}
          className="rounded-full bg-black/70 px-3.5 py-2 text-[0.72rem] font-semibold text-white shadow-lg backdrop-blur-md transition-opacity active:opacity-80"
        >
          Neigungssensor aktivieren
        </button>
      </div>
    );
  }

  if (tilt.permissionDenied && !tilt.active) {
    return (
      <p className="max-w-[17rem] text-center text-[0.68rem] font-medium leading-snug text-white/75">
        Neigungssensor nicht verfügbar — trotzdem möglichst gerade von oben
        fotografieren.
      </p>
    );
  }

  const levelColor = tilt.isLevel
    ? "border-emerald-400/90 bg-emerald-500/20"
    : tilt.active
      ? "border-amber-300/90 bg-amber-500/15"
      : "border-white/50 bg-black/30";

  const dotColor = tilt.isLevel
    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
    : "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.6)]";

  const roll = tilt.rollDeg ?? 0;
  const tiltDeg = tilt.tiltDeg ?? 0;
  const offsetX = Math.max(-18, Math.min(18, roll * 1.2));
  const offsetY = Math.max(-14, Math.min(14, tiltDeg * 0.9));

  return (
    <div className="pointer-events-none flex flex-col items-center gap-1.5">
      <div
        className={[
          "relative h-14 w-14 rounded-full border-2 backdrop-blur-[2px] transition-colors duration-200",
          levelColor,
        ].join(" ")}
        aria-hidden
      >
        <div className="absolute inset-2 rounded-full border border-white/20" />
        <div
          className={[
            "absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150",
            dotColor,
          ].join(" ")}
          style={{ transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))` }}
        />
      </div>
      <p
        className={[
          "rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold backdrop-blur-[2px]",
          tilt.isLevel ? "bg-emerald-500/80 text-white" : "bg-black/55 text-white/90",
        ].join(" ")}
      >
        {tilt.isLevel
          ? "Parallel — jetzt auslösen"
          : tilt.active
            ? "Gerade von oben halten"
            : "Neigung wird gemessen…"}
      </p>
    </div>
  );
}
