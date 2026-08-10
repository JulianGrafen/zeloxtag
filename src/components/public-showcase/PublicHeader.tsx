import Image from "next/image";
import { Gauge, Zap } from "lucide-react";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

type PublicHeaderProps = {
  profile: PublicShowcaseProfile;
};

function formatMileage(km: number | null): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  return `${km.toLocaleString("de-DE")} km`;
}

function formatPower(profile: PublicShowcaseProfile): string | null {
  if (profile.powerPs != null) return `${profile.powerPs} PS`;
  if (profile.powerKw != null) return `${profile.powerKw} kW`;
  return null;
}

export function PublicHeader({ profile }: PublicHeaderProps) {
  const title = [profile.make, profile.model].filter(Boolean).join(" ");
  const subtitle = profile.year ? `Baujahr ${profile.year}` : null;
  const mileage = formatMileage(profile.mileageKm);
  const power = formatPower(profile);

  return (
    <header className="overflow-hidden rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow)]">
      <div className="relative aspect-[16/10] w-full bg-[color:var(--vd-surface-elevated)]">
        {profile.heroImageSrc ? (
          <Image
            src={profile.heroImageSrc}
            alt={title || "Fahrzeug"}
            fill
            priority
            unoptimized
            className="object-contain object-center p-4"
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.85rem] text-[color:var(--vd-muted)]">
            Kein Fahrzeugfoto
          </div>
        )}
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            ZeloxTag Showcase
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-[color:var(--vd-text)] sm:text-[2rem]">
            {title || "Fahrzeugprofil"}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-[0.95rem] text-[color:var(--vd-muted)]">
              {subtitle}
              {profile.engine ? ` · ${profile.engine}` : ""}
            </p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3">
          {power ? (
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                <Zap className="h-3.5 w-3.5" aria-hidden />
                Leistung
              </dt>
              <dd className="mt-1 text-[1.05rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
                {power}
              </dd>
            </div>
          ) : null}
          {mileage ? (
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                <Gauge className="h-3.5 w-3.5" aria-hidden />
                Kilometer
              </dt>
              <dd className="mt-1 text-[1.05rem] font-semibold tabular-nums text-[color:var(--vd-text)]">
                {mileage}
              </dd>
            </div>
          ) : null}
        </dl>

        {profile.dynoChartUrl ? (
          <div className="overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]">
            <p className="border-b border-[color:var(--vd-border)] px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Leistungsdiagramm
            </p>
            <iframe
              title="Dyno Chart"
              src={profile.dynoChartUrl}
              className="aspect-[4/3] w-full bg-white"
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
