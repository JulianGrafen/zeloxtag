import { BuildDnaRadarChart } from "@/components/public-showcase/BuildDnaRadarChart";
import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";

type ShareCardBuildDnaBlockProps = {
  dna: ShowcaseBuildDna;
  compact?: boolean;
};

export function ShareCardBuildDnaBlock({
  dna,
  compact = false,
}: ShareCardBuildDnaBlockProps) {
  return (
    <div
      className={`flex shrink-0 flex-col items-center border-t border-white/10 px-4 ${
        compact ? "pt-4" : "pt-6"
      }`}
    >
      <p
        className={`w-full text-left font-mono font-medium uppercase tracking-[0.18em] text-zinc-500 ${
          compact ? "text-[16px]" : "text-[18px]"
        }`}
      >
        Umbau-DNA
      </p>
      <h3
        className={`mt-2 text-center font-semibold tracking-tight text-white ${
          compact ? "text-[28px]" : "text-[32px]"
        }`}
      >
        {dna.archetype}
      </h3>
      <div className={`mt-1 max-w-full ${compact ? "w-[260px]" : "w-[300px]"}`}>
        <BuildDnaRadarChart
          dna={dna}
          variant="compact"
          animate={false}
          reduceMotion
        />
      </div>
      <p
        className={`mt-2 text-center font-medium leading-snug text-white/70 ${
          compact ? "text-[20px]" : "text-[22px]"
        }`}
      >
        {dna.punchline}
      </p>
    </div>
  );
}
