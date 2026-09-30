import type { Metadata } from "next";

import { VehicleCostOverviewView } from "@/components/documents/vehicle-cost-overview-view";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
import { buildVehicleCostOverview } from "@/lib/documents/cost-overview";
import { scopeFromGarageRoute } from "@/lib/vehicle-surface/paths";

interface CostOverviewPageProps {
  params: Promise<{ vehicleId: string }>;
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
  const { vehicleId } = await params;
  const garageNavScope = scopeFromGarageRoute(vehicleId);
  const { scope, result, access } = await requireVehicleSurfaceWriter({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/dokumente/kosten`,
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

  return (
    <VehicleCostOverviewView
      vehicleSurfaceScope={garageNavScope}
      vehicleModel={vehicleModel}
      overview={overview}
    />
  );
}
