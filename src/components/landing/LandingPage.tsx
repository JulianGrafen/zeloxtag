import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";

import { CommunitySection } from "./CommunitySection";
import { FaqSection } from "./FaqSection";
import { FooterSection } from "./FooterSection";
import { HardwareBentoSection } from "./HardwareBentoSection";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { InteractiveDemoSection } from "./InteractiveDemoSection";
import { LandingAmbient } from "./LandingAmbient";
import { LandingScrollSmooth } from "./LandingScrollSmooth";
import { Navbar } from "./Navbar";
import { ProblemSection } from "./ProblemSection";
import { landingSurface } from "./landing-styles";

export function LandingPage() {
  return (
    <div className={landingSurface.page}>
      <LandingScrollSmooth />
      <LandingAmbient />
      <div className="relative z-10">
        <Navbar />
        <main>
          <HeroSection />
          <ProblemSection />
          <InteractiveDemoSection />
          <HardwareBentoSection />
          <HowItWorksSection />
          <CommunitySection />
          <FaqSection />
        </main>
        <FooterSection />
      </div>
      <CookieConsentBanner />
    </div>
  );
}
