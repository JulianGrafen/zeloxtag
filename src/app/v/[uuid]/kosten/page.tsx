import type { Metadata } from "next";

import { VehicleOperatingCostOverviewView } from "@/components/operating-costs/vehicle-operating-cost-overview-view";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { resolveOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";

interface OperatingCostsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Betriebskosten · ZeloxTag",
    description: "Monatliche Durchschnittskosten für Tanken, Versicherung und mehr.",
  };
}

export default async function VehicleOperatingCostsPage({
  params,
}: OperatingCostsPageProps) {
  const { uuid } = await params;
  const { result, isDemoShowcase } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/kosten`,
  });

  const vehicle = result.vehicle!;
  const entries = await resolveOperatingCostsForVehicle(
    vehicle.id,
    Boolean(isDemoShowcase),
  );
  const vehicleModel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <VehicleOperatingCostOverviewView
      vehicleSurfaceScope={{
        vehicleId: vehicle.id,
        linkedTagUuid: result.tag.uuid,
      }}
      tagUuid={result.tag.uuid}
      vehicleId={vehicle.id}
      vehicleModel={vehicleModel}
      entries={entries}
      readOnly={isDemoShowcase}
    />
  );
}
