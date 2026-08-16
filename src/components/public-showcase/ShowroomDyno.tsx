import { ExternalLink, Gauge } from "lucide-react";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

type ShowroomDynoProps = {
  profile: PublicShowcaseProfile;
};

export function ShowroomDyno({ profile }: ShowroomDynoProps) {
  if (!profile.dynoChartUrl) return null;

  return (
    <section className="px-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
        <p className="border-b border-white/10 px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Leistungsdiagramm
        </p>

        {profile.dynoChartIsImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.dynoChartUrl}
            alt={`Leistungsdiagramm ${profile.make} ${profile.model}`.trim()}
            className="aspect-[4/3] w-full bg-zinc-950 object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
              <Gauge className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-[0.88rem] leading-relaxed text-zinc-300">
              Dyno- bzw. Leistungsdiagramm als PDF hinterlegt.
            </p>
            <a
              href={profile.dynoChartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[0.88rem] font-semibold text-zinc-950"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Diagramm öffnen
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
