import { BuildDnaRadarChart } from "@/components/public-showcase/BuildDnaRadarChart";
import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";

type ShareCardBuildDnaBlockProps = {
  dna: ShowcaseBuildDna;
};

export function ShareCardBuildDnaBlock({ dna }: ShareCardBuildDnaBlockProps) {
  return (
    <div className="flex flex-col items-center border-t border-white/10 px-8 pt-8">
      <p className="w-full text-left font-mono text-[20px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        Umbau-DNA
      </p>
      <h3 className="mt-3 text-center text-[36px] font-semibold tracking-tight text-white">
        {dna.archetype}
      </h3>
      <div className="mt-2 w-[320px] max-w-full">
        <BuildDnaRadarChart
          dna={dna}
          variant="compact"
          animate={false}
          reduceMotion
        />
      </div>
      <p className="mt-4 text-center text-[26px] font-medium leading-snug text-white/70">
        {dna.punchline}
      </p>
    </div>
  );
}
