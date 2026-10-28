import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { DemoPartnerShowcasePage } from "./demo-partner-showcase-page";

type DemoRwEditionShowcasePageProps = {
  showcasePayload: PublicShowcasePayload;
};

export function DemoRwEditionShowcasePage({
  showcasePayload,
}: DemoRwEditionShowcasePageProps) {
  return <DemoPartnerShowcasePage showcasePayload={showcasePayload} />;
}
