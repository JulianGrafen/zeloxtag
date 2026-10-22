import type { Metadata } from "next";

import { DemoUndergroundGarageShowcasePage } from "@/components/demo/demo-underground-garage-showcase-page";
import { buildDemoUndergroundGaragePublicShowcasePayload } from "@/lib/demo/demo-underground-garage-showcase";
import { pageSocialMetadata } from "@/lib/seo/open-graph";

const TITLE = "BMW 440i · Underground Garage";

export const metadata: Metadata = {
  title: `Partner Demo · ${TITLE}`,
  description:
    "Öffentliche ZeloxTag Spec-Sheet Demo mit Underground Garage Partner-Branding (Stage 1 B58).",
  ...pageSocialMetadata({
    title: `Partner Demo · ${TITLE}`,
    description:
      "Öffentliche ZeloxTag Spec-Sheet Demo — BMW 440i Stage 1 mit Messwerten.",
    path: "/demo/underground-garage",
  }),
};

/**
 * B2B partner pitch: public vehicle pass with workshop branding.
 * Same twin as `/v/demo-underground-garage`.
 */
export default function DemoUndergroundGaragePartnerPage() {
  const showcasePayload = buildDemoUndergroundGaragePublicShowcasePayload();

  return (
    <DemoUndergroundGarageShowcasePage showcasePayload={showcasePayload} />
  );
}
