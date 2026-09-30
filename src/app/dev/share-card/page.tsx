import { notFound } from "next/navigation";

import { ShareableSpecCard } from "@/components/shareable-spec-card";
import { buildShareableBuildData } from "@/components/shareable-spec-card/build-shareable-build-data";
import { computeBuildDnaHeuristic } from "@/lib/showcase/build-dna-heuristic";
import { getMockTagScan, MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

/** Local preview for 9:16 share card export. */
export default function DevShareCardPage() {
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
      accel0To100Sec: 4.2,
    },
  };

  const documents = result.documents.map((doc) => ({
    ...doc,
    show_on_public_showcase: true,
  }));

  let payload = buildPublicShowcasePayload(vehicle, documents);
  if (!payload.buildDna && payload.modifications.length >= 2) {
    payload = {
      ...payload,
      buildDna: computeBuildDnaHeuristic(payload.modifications),
    };
  }

  const cardData = buildShareableBuildData({
    profile: payload.profile,
    modificationsCount: payload.modifications.length,
    buildDna: payload.buildDna,
  });

  if (!cardData) {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-black px-4 py-10 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Share Card (Dev)</h1>
          <p className="mt-1 text-sm text-white/55">
            9:16 Export für Instagram Stories — Mock-Fahrzeug aus der Dev-Garage.
          </p>
        </div>
        <ShareableSpecCard data={cardData} previewMaxWidth={280} />
      </div>
    </main>
  );
}
