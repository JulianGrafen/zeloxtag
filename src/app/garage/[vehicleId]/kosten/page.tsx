import type { Metadata } from "next";

import { VehicleOperatingCostOverviewView } from "@/components/operating-costs/vehicle-operating-cost-overview-view";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { listOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";
import { scopeFromGarageRoute } from "@/lib/vehicle-surface/paths";

interface OperatingCostsPageProps {
  params: Promise<{ vehicleId: string }>;
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
  const { vehicleId } = await params;
  const garageNavScope = scopeFromGarageRoute(vehicleId);
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/kosten`,
  });

  const vehicle = result.vehicle!;
  const entries = isDemoShowcase
    ? []
    : await listOperatingCostsForVehicle(vehicle.id);
  const vehicleModel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <VehicleOperatingCostOverviewView
      vehicleSurfaceScope={garageNavScope}
      tagUuid={scope.linkedTagUuid ?? vehicleId}
      vehicleId={vehicle.id}
      vehicleModel={vehicleModel}
      entries={entries}
      readOnly={isDemoShowcase}
    />
  );
}
