import type { Metadata } from "next";

import { VehicleFuelLogView } from "@/components/operating-costs/vehicle-fuel-log-view";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { loadFuelScanSubscriptionForOwner } from "@/lib/billing/subscription-service";
import { listOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";

interface FuelLogPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tanken · ZeloxTag",
    description: "Tankbuch und Verbrauch für diesen ZeloxTag.",
  };
}

export default async function VehicleFuelLogPage({ params }: FuelLogPageProps) {
  const { vehicleId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/tanken`,
  });

  const vehicle = result.vehicle!;
  const entries = isDemoShowcase
    ? []
    : await listOperatingCostsForVehicle(vehicle.id);
  const vehicleModel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;
  const fuelScanTier = isDemoShowcase
    ? {
        isPro: false,
        remainingFreeScans: 3,
        totalFreeScans: 3,
        canScan: true,
        quotaUnavailable: false,
      }
    : await loadFuelScanSubscriptionForOwner(vehicle.user_id);

  return (
    <VehicleFuelLogView
      tagUuid={scope.linkedTagUuid ?? vehicleId}
      vehicleId={vehicle.id}
      vehicleModel={vehicleModel}
      entries={entries}
      readOnly={isDemoShowcase}
      fuelScanTier={fuelScanTier}
    />
  );
}
