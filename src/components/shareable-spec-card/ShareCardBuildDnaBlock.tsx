import { BuildDnaRadarChart } from "@/components/public-showcase/BuildDnaRadarChart";
import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";

type ShareCardBuildDnaBlockProps = {
  dna: ShowcaseBuildDna;
  compact?: boolean;
  /** Fit fixed Story-Pass DNA zone (export layout). */
  fillHeight?: boolean;
};

export function ShareCardBuildDnaBlock({
  dna,
  compact = false,
  fillHeight = false,
}: ShareCardBuildDnaBlockProps) {
  const tight = compact || fillHeight;

  return (
    <div
      className={`flex flex-col items-center border-t border-white/10 px-2 ${
        fillHeight ? "h-full min-h-0 justify-center py-1" : tight ? "pt-4" : "pt-6"
      }`}
    >
      <p
        className={`w-full text-left font-mono font-medium uppercase tracking-[0.18em] text-zinc-500 ${
          tight ? "text-[15px]" : "text-[18px]"
        }`}
      >
        Umbau-DNA
      </p>
      <h3
        className={`mt-1 text-center font-semibold tracking-tight text-white ${
          tight ? "text-[24px]" : "text-[32px]"
        }`}
      >
        {dna.archetype}
      </h3>
      <div
        className={`mt-0.5 max-w-full ${fillHeight ? "w-[240px]" : tight ? "w-[260px]" : "w-[300px]"}`}
      >
        <BuildDnaRadarChart
          dna={dna}
          variant="compact"
          animate={false}
          reduceMotion
        />
      </div>
      <p
        className={`mt-1 line-clamp-2 text-center font-medium leading-snug text-white/70 ${
          tight ? "text-[17px]" : "text-[22px]"
        }`}
      >
        {dna.punchline}
      </p>
    </div>
  );
}
