import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { DemoPartnerShowcasePage } from "./demo-partner-showcase-page";

type DemoAulitzkyShowcasePageProps = {
  showcasePayload: PublicShowcasePayload;
};

/** Same showcase chrome as `/demo` (wordmark header + embedded hero). */
export function DemoAulitzkyShowcasePage({
  showcasePayload,
}: DemoAulitzkyShowcasePageProps) {
  return <DemoPartnerShowcasePage showcasePayload={showcasePayload} />;
}
