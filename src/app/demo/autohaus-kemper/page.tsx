import type { Metadata } from "next";

import { DemoAutohausKemperShowcasePage } from "@/components/demo/demo-autohaus-kemper-showcase-page";
import { buildDemoAutohausKemperPublicShowcasePayload } from "@/lib/demo/demo-autohaus-kemper-showcase";
import { pageSocialMetadata } from "@/lib/seo/open-graph";

const TITLE = 'VW Golf V R32 „Black Betty" · Autohaus Kemper';

export const metadata: Metadata = {
  title: `Partner Demo · ${TITLE}`,
  description:
    "Öffentliche ZeloxTag Spec-Sheet Demo mit Unique Projects by Autohaus Kemper (B2B).",
  ...pageSocialMetadata({
    title: `Partner Demo · ${TITLE}`,
    description:
      "Öffentliche ZeloxTag Spec-Sheet Demo mit Unique Projects by Autohaus Kemper.",
    path: "/demo/autohaus-kemper",
  }),
};

/**
 * B2B partner pitch: public vehicle pass with Autohaus Kemper branding.
 * Same twin as `/v/demo-autohaus-kemper`.
 */
export default function DemoAutohausKemperPartnerPage() {
  const showcasePayload = buildDemoAutohausKemperPublicShowcasePayload();

  return <DemoAutohausKemperShowcasePage showcasePayload={showcasePayload} />;
}
