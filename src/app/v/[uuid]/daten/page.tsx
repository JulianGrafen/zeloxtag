import type { Metadata } from "next";

import { VehicleSpecsView } from "@/components/vehicles/vehicle-specs-view";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

interface VehicleSpecsPageProps {
  params: Promise<{ uuid: string }>;
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
  const { uuid } = await params;
  const { result, access, isDemoShowcase } = await requireTagOwner(uuid);
  const vehicle = result.vehicle;
  if (!vehicle) {
    return null;
  }

  return (
    <VehicleSpecsView
      tagUuid={result.tag.uuid}
      vehicle={{
        ...vehicle,
        tech_specs: parseVehicleTechSpecs(vehicle.tech_specs),
      }}
      canEdit={access.isOwner && !isDemoShowcase}
    />
  );
}
