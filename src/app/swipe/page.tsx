import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { discoverPageRootClassName } from "@/components/showcase-swipe/discover-minimal/discover-surface-styles";
import { PublicSwipeExperience } from "@/components/public-swipe/public-swipe-experience";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { pageSocialMetadata } from "@/lib/seo/open-graph";

export const metadata: Metadata = {
  title: "Builds swipen · ZeloxTag",
  description:
    "Projektautos entdecken — swipe durch öffentliche Builds und finde dein nächstes Setup.",
  ...pageSocialMetadata({
    title: "Builds swipen · ZeloxTag",
    description:
      "Projektautos entdecken — swipe durch öffentliche Builds und finde dein nächstes Setup.",
    path: "/swipe",
  }),
};

export default function PublicSwipePage() {
  return (
    <AppShell showNavbar={false} immersiveNativeNav>
      <div className={discoverPageRootClassName}>
        <VehicleSettingsSubpageShell
          tagUuid="public"
          title="Builds entdecken"
          backHref="/"
          backLabel="Start"
          theme="discover"
        >
          <PublicSwipeExperience />
          <LegalFooterNav tone="inverse" className="pt-2" />
        </VehicleSettingsSubpageShell>
      </div>
    </AppShell>
  );
}
