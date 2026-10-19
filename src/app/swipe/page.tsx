import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
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
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid="public"
        kicker="Entdecken"
        title="Builds entdecken"
        backHref="/"
        backLabel="Start"
        description={
          <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
            Like öffentliche Projektautos aus der Community
          </p>
        }
      >
        <PublicSwipeExperience />
        <LegalFooterNav className="pt-2" />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
