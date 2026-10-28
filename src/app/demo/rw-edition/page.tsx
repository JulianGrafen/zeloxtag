import type { Metadata } from "next";

import { DemoRwEditionShowcasePage } from "@/components/demo/demo-rw-edition-showcase-page";
import { buildDemoRwEditionPublicShowcasePayload } from "@/lib/demo/demo-rw-edition-showcase";
import { pageSocialMetadata } from "@/lib/seo/open-graph";

const TITLE = "MINI JCW F56 · RW Edition";

export const metadata: Metadata = {
  title: `Partner Demo · ${TITLE}`,
  description:
    "Öffentliche ZeloxTag Spec-Sheet Demo mit RW Edition Partner-Branding (MINI JCW Stufe 2).",
  ...pageSocialMetadata({
    title: `Partner Demo · ${TITLE}`,
    description:
      "Öffentliche ZeloxTag Spec-Sheet Demo — MINI JCW mit 301 PS / 428 Nm und RW Edition Partner-Branding.",
    path: "/demo/rw-edition",
  }),
};

/**
 * B2B partner pitch: public vehicle pass with workshop branding.
 * Same twin as `/v/demo-rw-edition`.
 */
export default function DemoRwEditionPartnerPage() {
  const showcasePayload = buildDemoRwEditionPublicShowcasePayload();

  return <DemoRwEditionShowcasePage showcasePayload={showcasePayload} />;
}
