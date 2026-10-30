import { landingHero, landingHeroShowcase } from "@/data/landingContent";

import { LandingCtaLink } from "./LandingCtaLink";
import { GlassSurface } from "./GlassSurface";
import { PhoneCockpit } from "./PhoneCockpit";
import { SteelTagPlate } from "./SteelTagPlate";
import { landingSurface } from "./landing-styles";

export function HeroSection() {
  return (
    <section className={`${landingSurface.section} pt-16 sm:pt-24`}>
      <div className={landingSurface.container}>
        <div className="mx-auto max-w-3xl text-center">
          <p className={landingSurface.kicker}>{landingHero.badge}</p>
          <h1 className={`${landingSurface.h1} mt-5`}>{landingHero.headline}</h1>
          <p className={`${landingSurface.lead} mx-auto mt-5 max-w-2xl`}>
            {landingHero.subhead}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LandingCtaLink href={landingHero.primaryHref} variant="primary">
              {landingHero.primaryCta}
            </LandingCtaLink>
            <LandingCtaLink href={landingHero.secondaryHref} variant="glass">
              {landingHero.secondaryCta}
            </LandingCtaLink>
          </div>
        </div>

        <GlassSurface className="mt-16 overflow-hidden p-4 sm:p-6 lg:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <SteelTagPlate />
            <PhoneCockpit />
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {landingHeroShowcase.specPills.map((pill) => (
              <li
                key={pill}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-widest text-white/55"
              >
                {pill}
              </li>
            ))}
          </ul>
        </GlassSurface>
      </div>
    </section>
  );
}
