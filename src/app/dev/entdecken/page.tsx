import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { discoverFullPageRootClassName } from "@/components/showcase-swipe/discover-minimal/discover-surface-styles";
import { DemoDiscoverExperience } from "@/components/demo/demo-discover-experience";
import { loadDemoEntdeckenDiscoverData } from "@/lib/demo/load-demo-entdecken-discover-data";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

export default async function DevEntdeckenPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const tagUuid = MOCK_TAG_UUIDS.active;
  const entdeckenReturnHref = "/dev/entdecken";
  const discoverData = await loadDemoEntdeckenDiscoverData();

  return (
    <AppShell showNavbar={false} immersiveNativeNav>
      <div className={discoverFullPageRootClassName}>
        <VehicleSettingsSubpageShell
          tagUuid={tagUuid}
          title="Builds entdecken"
          backHref="/demo"
          backLabel="Dashboard"
          theme="discover"
        >
          <DemoDiscoverExperience
            tagUuid={tagUuid}
            entdeckenReturnHref={entdeckenReturnHref}
            discoverData={discoverData}
            embeddedInShell
          />
        </VehicleSettingsSubpageShell>
      </div>
    </AppShell>
  );
}
