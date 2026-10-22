import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { DemoPartnerShowcasePage } from "./demo-partner-showcase-page";

type DemoUndergroundGarageShowcasePageProps = {
  showcasePayload: PublicShowcasePayload;
};

export function DemoUndergroundGarageShowcasePage({
  showcasePayload,
}: DemoUndergroundGarageShowcasePageProps) {
  return <DemoPartnerShowcasePage showcasePayload={showcasePayload} />;
}
