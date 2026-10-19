import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { discoverPageRootClassName } from "@/components/showcase-swipe/discover-minimal/discover-surface-styles";
import { ShowcaseDiscoverExperience } from "@/components/showcase-swipe/showcase-discover-experience";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { buildDemoShareCardData } from "@/lib/demo/demo-share-card-data";
import {
  DEV_ENTDECKEN_MOCK_CARDS,
  DEV_ENTDECKEN_MOCK_DAILY_STATS,
  DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS,
  DEV_ENTDECKEN_MOCK_WEEKLY_RANK,
} from "@/lib/showcase/dev-entdecken-mock";

export default function DevEntdeckenPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const tagUuid = "dev-entdecken";
  const entdeckenReturnHref = "/dev/entdecken";
  const ownTopThreeShareCardData = buildDemoShareCardData(2);

  return (
    <AppShell showNavbar={false} immersiveNativeNav>
      <div className={discoverPageRootClassName}>
        <VehicleSettingsSubpageShell
          tagUuid={tagUuid}
          title="Builds entdecken"
          backHref="/demo"
          backLabel="Dashboard"
          theme="discover"
        >
          <ShowcaseDiscoverExperience
            tagUuid={tagUuid}
            entdeckenReturnHref={entdeckenReturnHref}
            initialCards={DEV_ENTDECKEN_MOCK_CARDS}
            initialWeeklyBuilds={DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS}
            isPublic
            showcaseSwipeOptIn
            ownWeeklyRank={DEV_ENTDECKEN_MOCK_WEEKLY_RANK}
            dailySwipeStats={DEV_ENTDECKEN_MOCK_DAILY_STATS}
            ownTopThreeShareCardData={ownTopThreeShareCardData}
            designPreview
          />
          <LegalFooterNav tone="inverse" className="pt-2" />
        </VehicleSettingsSubpageShell>
      </div>
    </AppShell>
  );
}
