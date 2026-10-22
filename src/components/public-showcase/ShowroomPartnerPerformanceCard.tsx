"use client";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";
import { cn } from "@/lib/utils";

import { ShowroomGroup } from "./ShowroomGroup";
import { showroom } from "./showroom-styles";

type ShowroomPartnerPerformanceCardProps = {
  profile: PublicShowcaseProfile;
  className?: string;
};

function formatStat(value: number | null | undefined, unit: string): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return `${rounded} ${unit}`;
}

export function ShowroomPartnerPerformanceCard({
  profile,
  className,
}: ShowroomPartnerPerformanceCardProps) {
  const power = formatStat(profile.powerPs, "PS");
  const torque = formatStat(profile.torqueNm, "Nm");
  const accel =
    profile.accel0To100Sec != null && Number.isFinite(profile.accel0To100Sec)
      ? `${profile.accel0To100Sec.toFixed(1)} s`
      : null;
  const dynoSrc = profile.dynoChartUrl?.trim() || null;

  if (!power && !torque && !dynoSrc) {
    return null;
  }

  return (
    <section className={cn("px-4", className)} aria-label="Performance Specs">
      <h2 className={showroom.sectionLabel}>Performance Specs</h2>
      <ShowroomGroup>
        {(power || torque || accel) ? (
          <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3">
            {power ? (
              <div className="bg-zinc-950/80 px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Leistung
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold tabular-nums tracking-tight text-white">
                  {power}
                </p>
              </div>
            ) : null}
            {torque ? (
              <div className="bg-zinc-950/80 px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Drehmoment
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold tabular-nums tracking-tight text-white">
                  {torque}
                </p>
              </div>
            ) : null}
            {accel ? (
              <div className="col-span-2 bg-zinc-950/80 px-4 py-4 sm:col-span-1">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  0–100 km/h
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold tabular-nums tracking-tight text-white">
                  {accel}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {dynoSrc ? (
          <div className="border-t border-white/10 bg-black">
            <p className="px-4 pt-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Prüfstandsdiagramm
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dynoSrc}
              alt={`Leistungsdiagramm ${profile.make} ${profile.model}`.trim()}
              className="aspect-[16/9] w-full object-contain bg-black"
            />
          </div>
        ) : null}
      </ShowroomGroup>
    </section>
  );
}
