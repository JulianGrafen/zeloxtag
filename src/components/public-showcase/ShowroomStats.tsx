import { Cog, Gauge, Zap } from "lucide-react";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { SpecCard } from "./SpecCard";
import { showroom } from "./showroom-styles";

type ShowroomStatsProps = {
  profile: PublicShowcaseProfile;
};

function formatPower(profile: PublicShowcaseProfile): string | null {
  const parts: string[] = [];
  if (profile.powerPs != null) parts.push(`${profile.powerPs} PS`);
  if (profile.powerKw != null) parts.push(`${profile.powerKw} kW`);
  if (profile.torqueNm != null) parts.push(`${profile.torqueNm} Nm`);
  return parts.length > 0 ? parts.join(" · ") : null;
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
  const power = formatPower(profile);
  const engine = formatEngine(profile);
  const drive = formatDrivetrain(profile);
  if (!power && !engine && !drive) return null;

  return (
    <section className="-mt-5 px-4">
      <div className="grid grid-cols-3 gap-2">
        <SpecCard
          label="Leistung"
          value={power ?? "—"}
          icon={<Zap className={`h-3 w-3 ${showroom.icon}`} aria-hidden />}
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
