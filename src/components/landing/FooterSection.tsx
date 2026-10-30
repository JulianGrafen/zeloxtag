import {
  LANDING_SHOP_HREF,
  landingBrand,
  landingCta,
  landingFooter,
} from "@/data/landingContent";

import { GlassSurface } from "./GlassSurface";
import { LandingCtaLink } from "./LandingCtaLink";
import { landingSurface } from "./landing-styles";

export function FooterSection() {
  return (
    <footer className={`${landingSurface.section} pt-8`}>
      <div className={landingSurface.container}>
        <GlassSurface className="px-6 py-12 text-center sm:px-10 sm:py-16">
          <h2 className={landingSurface.h2}>{landingCta.headline}</h2>
          <p className={`${landingSurface.lead} mx-auto mt-4 max-w-xl`}>
            {landingCta.subhead}
          </p>
          <div className="mt-8 flex justify-center">
            <LandingCtaLink href={LANDING_SHOP_HREF} variant="primary">
              {landingCta.button}
            </LandingCtaLink>
          </div>
        </GlassSurface>

        <div className="mt-10 flex flex-col items-center gap-4 pb-4 text-center">
          <p className="text-sm text-white/45">{landingBrand.claim}</p>
          <nav
            aria-label="Rechtliches"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
          >
            {landingFooter.legal.map((page) => (
              <a
                key={page.href}
                href={page.href}
                className="min-h-11 inline-flex items-center text-[0.78rem] text-white/40 underline-offset-2 hover:text-white/75 hover:underline"
              >
                {page.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
