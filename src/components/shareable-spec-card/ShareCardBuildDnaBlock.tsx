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

  if (fillHeight) {
    return (
      <div
        data-share-dna-block=""
        className="flex h-full min-h-0 flex-col border-t border-white/10 px-6 py-3"
      >
        <p className="w-full shrink-0 text-left font-mono text-[24px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Umbau-DNA
        </p>
        <h3 className="shrink-0 text-center text-[40px] font-semibold leading-tight tracking-tight text-white">
          {dna.archetype}
        </h3>
        <div className="flex min-h-0 w-full flex-1 items-center justify-center py-2">
          <div className="aspect-square h-full max-h-[min(100%,440px)] w-full max-w-[min(100%,460px)]">
            <BuildDnaRadarChart
              dna={dna}
              variant="story"
              animate={false}
              reduceMotion
              className="h-full w-full"
            />
          </div>
        </div>
        <p className="line-clamp-2 shrink-0 text-center text-[26px] font-medium leading-snug text-white/70">
          {dna.punchline}
        </p>
      </div>
    );
  }

  return (
    <div
      data-share-dna-block=""
      className={`flex flex-col items-center border-t border-white/10 px-2 ${
        tight ? "pt-4" : "pt-6"
      }`}
    >
      <p
        className={`w-full text-left font-mono font-medium uppercase tracking-[0.18em] text-zinc-500 ${
          tight ? "text-[20px]" : "text-[22px]"
        }`}
      >
        Umbau-DNA
      </p>
      <h3
        className={`text-center font-semibold tracking-tight text-white ${
          tight ? "text-[32px]" : "text-[40px]"
        }`}
      >
        {dna.archetype}
      </h3>
      <div
        className={`max-w-full shrink-0 ${tight ? "w-[260px]" : "w-[300px]"}`}
      >
        <BuildDnaRadarChart
          dna={dna}
          variant="compact"
          animate={false}
          reduceMotion
        />
      </div>
      <p
        className={`line-clamp-2 text-center font-medium leading-snug text-white/70 ${
          tight ? "text-[22px]" : "text-[26px]"
        }`}
      >
        {dna.punchline}
      </p>
    </div>
  );
}
