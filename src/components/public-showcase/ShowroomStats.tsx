"use client";

import type { ReactNode } from "react";
import { Activity, Cog, Gauge, Zap } from "lucide-react";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import CountUp from "./CountUp";
import { SpecCard } from "./SpecCard";
import { showroom } from "./showroom-styles";

type ShowroomStatsProps = {
  profile: PublicShowcaseProfile;
};

function formatEngine(profile: PublicShowcaseProfile): string | null {
  if (profile.engine) return profile.engine;
  if (profile.displacementCc != null) {
    const liters = (profile.displacementCc / 1000).toFixed(1);
    return `${liters}L`;
  }
  return null;
}

function formatDrivetrain(profile: PublicShowcaseProfile): string | null {
  const parts = [profile.drivetrain, profile.transmission].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function animatedStatValue(
  amount: number | null | undefined,
  unit: string,
): ReactNode {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return (
    <>
      <CountUp
        from={0}
        to={amount}
        separator=","
        direction="up"
        duration={1}
        className="count-up-text"
        delay={0}
      />{" "}
      {unit}
    </>
  );
}

export function ShowroomStats({ profile }: ShowroomStatsProps) {
  const engine = formatEngine(profile);
  const drive = formatDrivetrain(profile);
  const hasPower = profile.powerPs != null;
  const hasTorque = profile.torqueNm != null;

  if (!hasPower && !hasTorque && !engine && !drive) return null;

  return (
    <section className="relative z-10 px-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SpecCard
          label="Leistung"
          value={animatedStatValue(profile.powerPs, "PS")}
          icon={<Zap className={`h-3 w-3 ${showroom.icon}`} aria-hidden />}
        />
        <SpecCard
          label="Drehmoment"
          value={animatedStatValue(profile.torqueNm, "Nm")}
          icon={<Activity className={`h-3 w-3 ${showroom.icon}`} aria-hidden />}
        />
        <SpecCard
          label="Motor"
          value={engine ?? "—"}
          icon={<Cog className={`h-3 w-3 ${showroom.icon}`} aria-hidden />}
        />
        <SpecCard
          label="Antrieb"
          value={drive ?? "—"}
          icon={<Gauge className={`h-3 w-3 ${showroom.icon}`} aria-hidden />}
        />
      </div>
    </section>
  );
}
