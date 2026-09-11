import { Activity, Cog, Gauge, Zap } from "lucide-react";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { SpecCard } from "./SpecCard";
import { showroom } from "./showroom-styles";

type ShowroomStatsProps = {
  profile: PublicShowcaseProfile;
};

function formatPowerPs(profile: PublicShowcaseProfile): string | null {
  if (profile.powerPs == null) return null;
  return `${profile.powerPs} PS`;
}

function formatTorqueNm(profile: PublicShowcaseProfile): string | null {
  if (profile.torqueNm == null) return null;
  return `${profile.torqueNm} Nm`;
}

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

export function ShowroomStats({ profile }: ShowroomStatsProps) {
  const powerPs = formatPowerPs(profile);
  const torqueNm = formatTorqueNm(profile);
  const engine = formatEngine(profile);
  const drive = formatDrivetrain(profile);
  if (!powerPs && !torqueNm && !engine && !drive) return null;

  return (
    <section className="relative z-10 px-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SpecCard
          label="Leistung"
          value={powerPs ?? "—"}
          icon={<Zap className={`h-3 w-3 ${showroom.icon}`} aria-hidden />}
        />
        <SpecCard
          label="Drehmoment"
          value={torqueNm ?? "—"}
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
