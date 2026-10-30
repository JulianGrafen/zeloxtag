import { landingHardware } from "@/data/landingContent";
import { cn } from "@/lib/utils";

import { GlassSurface } from "./GlassSurface";
import { LandingTagProductImage } from "./LandingTagProductImage";
import { landingSurface } from "./landing-styles";

export function HardwareBentoSection() {
  return (
    <section
      id={landingHardware.id}
      className={`${landingSurface.section} ${landingSurface.sectionMuted}`}
    >
      <div className={landingSurface.container}>
        <h2 className={`${landingSurface.h2} max-w-3xl`}>
          {landingHardware.headline}
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {landingHardware.tiles.map((tile) => (
            <GlassSurface
              key={tile.title}
              className={cn(
                "p-6 sm:p-7",
                tile.size === "large" && "lg:col-span-3",
              )}
            >
              {tile.size === "large" ? (
                <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
                  <div>
                    <p className={landingSurface.kicker}>{tile.kicker}</p>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      {tile.title}
                    </h3>
                    <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-white/58 sm:text-lg">
                      {tile.body}
                    </p>
                  </div>
                  <div className="flex justify-center lg:justify-end">
                    <LandingTagProductImage
                      sizes="(max-width: 1024px) 70vw, 14rem"
                      className="max-w-[14rem]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className={landingSurface.kicker}>{tile.kicker}</p>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
                    {tile.title}
                  </h3>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-white/58 sm:text-[0.95rem]">
                    {tile.body}
                  </p>
                </>
              )}
            </GlassSurface>
          ))}
        </div>
      </div>
    </section>
  );
}
