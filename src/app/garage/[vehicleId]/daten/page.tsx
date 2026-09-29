import type { Metadata } from "next";

import { VehicleSpecsView } from "@/components/vehicles/vehicle-specs-view";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

interface VehicleSpecsPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Technische Daten · ZeloxTag",
    description: "Stammdaten und technische Fahrzeugdaten hinterlegen.",
  };
}

export default async function VehicleSpecsPage({
  params,
}: VehicleSpecsPageProps) {
  const { vehicleId } = await params;
  const { scope, result, access, isDemoShowcase } = await requireVehicleSurfaceOwner({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/daten/daten`,
  });
  const vehicle = result.vehicle;
  if (!vehicle) {
    return null;
  }

  return (
    <VehicleSpecsView
      tagUuid={scope.linkedTagUuid ?? vehicleId}
      vehicle={{
        ...vehicle,
        tech_specs: parseVehicleTechSpecs(vehicle.tech_specs),
      }}
      canEdit={access.isOwner && !isDemoShowcase}
    />
  );
}
