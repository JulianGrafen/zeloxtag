"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { VehicleSilhouette } from "./VehicleSilhouette";

interface VehicleDashboardHeaderProps {
  ownerName: string;
  vehicleModel: string;
  vehicleImage?: string;
  vehicleImageAlt?: string;
  statusLabel?: string;
}

const CAR_START: CSSProperties = {
  transform: "translate3d(130%, 0, 0)",
  opacity: 0.25,
  transition: "none",
};

const CAR_END: CSSProperties = {
  transform: "translate3d(0, 0, 0)",
  opacity: 1,
  transition:
    "transform 1.25s cubic-bezier(0.16, 0.84, 0.22, 1), opacity 1.1s ease-out",
};

export function VehicleDashboardHeader({
  ownerName,
  vehicleModel,
  vehicleImage,
  vehicleImageAlt,
  statusLabel = "ZeloxTag · Verbunden",
}: VehicleDashboardHeaderProps) {
  const greeting = `${ownerName}s ${vehicleModel}`;
  const [carStyle, setCarStyle] = useState<CSSProperties>(CAR_START);
  const [headlightsOn, setHeadlightsOn] = useState(false);

  useEffect(() => {
    const timers: number[] = [];

    // Nächster Frame: Einfahrt starten (damit Startposition erst gerendert ist)
    timers.push(
      window.setTimeout(() => {
        setCarStyle(CAR_END);

        timers.push(
          window.setTimeout(() => setHeadlightsOn(true), 320),
          window.setTimeout(() => setHeadlightsOn(false), 460),
          window.setTimeout(() => setHeadlightsOn(true), 560),
          window.setTimeout(() => setHeadlightsOn(false), 700),
        );
      }, 50),
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <header className="relative overflow-hidden rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/80 p-5 shadow-[var(--vd-shadow)] backdrop-blur-xl sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--vd-glow)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,var(--vd-glow-soft)_0%,transparent_50%)]"
      />

      <div className="relative flex items-center justify-between gap-3 sm:gap-5">
        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            <span>{statusLabel}</span>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
              aria-label="Verbunden"
            />
          </p>
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.9rem]">
              Willkommen!
            </h1>
            <p className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold leading-snug tracking-[-0.03em] text-[color:var(--vd-accent)] sm:text-[1.4rem]">
              {ownerName}s {vehicleModel}
            </p>
          </div>
        </div>

        <div className="vd-car-stage relative w-[44%] max-w-[11rem] shrink-0 sm:w-[12.5rem] sm:max-w-none">
          {vehicleImage ? (
            <div
              className="vd-car relative h-[4.75rem] w-full sm:h-28"
              style={carStyle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vehicleImage}
                alt={vehicleImageAlt ?? greeting}
                className="relative z-[1] h-full w-full object-contain object-right"
              />
              <span
                aria-hidden
                className={`vd-headlight vd-headlight--main${headlightsOn ? " vd-headlight--on" : ""}`}
              />
              <span
                aria-hidden
                className={`vd-headlight vd-headlight--beam${headlightsOn ? " vd-headlight--on" : ""}`}
              />
            </div>
          ) : (
            <div
              className="vd-car flex h-[4.75rem] w-full items-end justify-end sm:h-28"
              style={carStyle}
            >
              <VehicleSilhouette
                label={`${vehicleModel} Silhouette`}
                className="h-14 w-full text-[color:var(--vd-accent)] sm:h-20"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
