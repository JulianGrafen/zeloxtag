import type { Metadata } from "next";

import { OilIntervalsView } from "@/components/vehicle-dashboard";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { oilChangeRecordsFromDocuments } from "@/lib/documents/oil-changes";
import { FEATURE } from "@/lib/permissions/feature-access";

interface OilIntervalsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Öl-Wechsel · ZeloxTag",
    description: "Ölwechsel-Historie für diesen ZeloxTag.",
  };
}

export default async function VehicleOilIntervalsPage({
  params,
}: OilIntervalsPageProps) {
  const { uuid } = await params;
  const { result, isDemoShowcase } = await requireTagWriter(uuid);

  const records = oilChangeRecordsFromDocuments(result.documents);
  const vehicleModel = `${result.vehicle!.make} ${result.vehicle!.model}`;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: result.tag.uuid,
    feature: FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    children: (
      <OilIntervalsView
        vehicleModel={vehicleModel}
        records={records}
        backHref={`/v/${result.tag.uuid}`}
        basePath={`/v/${result.tag.uuid}/intervalle`}
        scanHref={`/v/${result.tag.uuid}?scan=1`}
        tagUuid={result.tag.uuid}
        vehicleId={result.vehicle!.id}
        canAddManual
      />
    ),
  });
}
