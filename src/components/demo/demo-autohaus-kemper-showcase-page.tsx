import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { DemoPartnerShowcasePage } from "./demo-partner-showcase-page";

type DemoAutohausKemperShowcasePageProps = {
  showcasePayload: PublicShowcasePayload;
};

export function DemoAutohausKemperShowcasePage({
  showcasePayload,
}: DemoAutohausKemperShowcasePageProps) {
  return <DemoPartnerShowcasePage showcasePayload={showcasePayload} />;
}
