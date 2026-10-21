import type { Metadata } from "next";

import { DemoPageExperience } from "@/components/demo/demo-page-experience";
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

  return (
    <DemoPageExperience
      vehicle={result.vehicle}
      documents={result.documents}
      tagUuid={result.tag.uuid}
    />
  );
}
