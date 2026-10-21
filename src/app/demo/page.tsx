import type { Metadata } from "next";

import { DemoPageExperience } from "@/components/demo/demo-page-experience";
import {
  buildDemoPublicShowcasePayload,
  enrichDemoShowcaseVehicle,
} from "@/lib/demo/demo-public-showcase-payload";
import { pageSocialMetadata } from "@/lib/seo/open-graph";
import {
  getMockTagScan,
  MOCK_TAG_UUIDS,
} from "@/lib/tags/mock-tags";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "Öffentliche Demo des ZeloxTag Fahrzeug-Dashboards (BMW E36).",
  ...pageSocialMetadata({
    title: "Demo · BMW E36 328i",
    description:
      "Öffentliche Demo des ZeloxTag Fahrzeug-Dashboards (BMW E36).",
    path: "/demo",
    imagePath: "/demo/opengraph-image",
  }),
};

/**
 * Optional showcase of the vehicle twin — not the production landing page.
 * Landing remains `/` (login). Deep-link: `/demo`.
 */
export default function DemoPage() {
  const result = getMockTagScan(MOCK_TAG_UUIDS.active);
  if (!result?.vehicle) {
    return null;
  }

  const vehicle = enrichDemoShowcaseVehicle(result.vehicle);
  const showcasePayload = buildDemoPublicShowcasePayload(
    vehicle,
    result.documents,
  );

  return (
    <DemoPageExperience
      vehicle={vehicle}
      documents={result.documents}
      tagUuid={result.tag.uuid}
      showcasePayload={showcasePayload}
    />
  );
}
