import { notFound } from "next/navigation";

import { PublicShowcaseView } from "@/components/public-showcase/PublicShowcaseView";
import { getMockTagScan, MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

/** Local-only preview of the public showcase (no auth / owner dashboard). */
export default function DevShowroomPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const result = getMockTagScan(MOCK_TAG_UUIDS.active);
  if (!result?.vehicle) {
    notFound();
  }

  const vehicle = {
    ...result.vehicle,
    is_public: true,
    tech_specs: {
      ...(typeof result.vehicle.tech_specs === "object" &&
      result.vehicle.tech_specs !== null
        ? result.vehicle.tech_specs
        : {}),
      instagramHandle: "zeloxtag",
    },
  };

  const documents = result.documents.map((doc) => ({
    ...doc,
    show_on_public_showcase: true,
  }));

  const payload = buildPublicShowcasePayload(vehicle, documents);

  return <PublicShowcaseView data={payload} />;
}
