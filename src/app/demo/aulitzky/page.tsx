import type { Metadata } from "next";

import { DemoAulitzkyShowcasePage } from "@/components/demo/demo-aulitzky-showcase-page";
import { buildDemoAulitzkyPublicShowcasePayload } from "@/lib/demo/demo-aulitzky-showcase";
import { pageSocialMetadata } from "@/lib/seo/open-graph";

const TITLE = "BMW M4 G82 · Aulitzky Tuning";

export const metadata: Metadata = {
  title: `Partner Demo · ${TITLE}`,
  description:
    "Öffentliche ZeloxTag Spec-Sheet Demo mit Aulitzky Tuning Partner-Branding (B2B).",
  ...pageSocialMetadata({
    title: `Partner Demo · ${TITLE}`,
    description:
      "Öffentliche ZeloxTag Spec-Sheet Demo mit Aulitzky Tuning Partner-Branding.",
    path: "/demo/aulitzky",
  }),
};

/**
 * B2B partner pitch: public vehicle pass with workshop branding.
 * Same twin as `/v/demo-aulitzky`.
 */
export default function DemoAulitzkyPartnerPage() {
  const showcasePayload = buildDemoAulitzkyPublicShowcasePayload();

  return <DemoAulitzkyShowcasePage showcasePayload={showcasePayload} />;
}
