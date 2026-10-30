import { landingCommunity } from "@/data/landingContent";

import { GlassSurface } from "./GlassSurface";
import { landingSurface } from "./landing-styles";

export function CommunitySection() {
  return (
    <section
      id={landingCommunity.id}
      className={`${landingSurface.section} ${landingSurface.sectionMuted}`}
    >
      <div className={landingSurface.container}>
        <h2 className={`${landingSurface.h2} max-w-3xl`}>
          {landingCommunity.headline}
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {landingCommunity.quotes.map((item) => (
            <GlassSurface key={item.vehicle} className="p-6 sm:p-7">
              <p className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-white/70">
                {item.vehicle}
              </p>
              <blockquote className="mt-5 text-pretty text-base leading-relaxed text-white/80">
                {item.quote}
              </blockquote>
              <p className="mt-4 font-mono text-[0.62rem] uppercase tracking-widest text-white/35">
                {item.context}
              </p>
            </GlassSurface>
          ))}
        </div>
      </div>
    </section>
  );
}
