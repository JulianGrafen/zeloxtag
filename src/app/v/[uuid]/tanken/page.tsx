import type { Metadata } from "next";

import { VehicleFuelLogView } from "@/components/operating-costs/vehicle-fuel-log-view";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { listOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";

interface FuelLogPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tanken · ZeloxTag",
    description: "Tankbuch und Verbrauch für diesen ZeloxTag.",
  };
}

export default async function VehicleFuelLogPage({ params }: FuelLogPageProps) {
  const { uuid } = await params;
  const { result, isDemoShowcase } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/tanken`,
  });

  const vehicle = result.vehicle!;
  const entries = isDemoShowcase
    ? []
    : await listOperatingCostsForVehicle(vehicle.id);
  const vehicleModel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <VehicleFuelLogView
      tagUuid={result.tag.uuid}
      vehicleId={vehicle.id}
      vehicleModel={vehicleModel}
      entries={entries}
      readOnly={isDemoShowcase}
    />
  );
}
