import type { Metadata } from "next";

import { VehicleCostOverviewView } from "@/components/documents/vehicle-cost-overview-view";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { buildVehicleCostOverview } from "@/lib/documents/cost-overview";
import { FEATURE } from "@/lib/permissions/feature-access";

interface CostOverviewPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kostenübersicht · ZeloxTag",
    description: "Investition, Umbau- und Wartungskosten aus deinen Belegen.",
  };
}

export default async function VehicleCostOverviewPage({
  params,
}: CostOverviewPageProps) {
  const { uuid } = await params;
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid, {
    loginNext: `/v/${uuid}/dokumente/kosten`,
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "invoice",
      },
    },
  });

  const documents =
    access.isContributor && !access.isOwner
      ? result.documents.filter((doc) => doc.type === "invoice")
      : result.documents;

  const vehicle = result.vehicle!;
  const overview = buildVehicleCostOverview(documents);
  const vehicleModel =
    `${vehicle.make} ${vehicle.model}`.trim() || vehicle.model;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: vehicle.user_id,
    tagUuid: result.tag.uuid,
    feature: FEATURE.VIEW_COST_OVERVIEW,
    isContributor: access.isContributor && !access.isOwner,
    children: (
      <VehicleCostOverviewView
        tagUuid={result.tag.uuid}
        vehicleModel={vehicleModel}
        overview={overview}
      />
    ),
  });
}
