import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";

import { FuelReceiptUploader } from "@/components/operating-costs/fuel-receipt-uploader";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { loadFuelScanSubscriptionForOwner } from "@/lib/billing/subscription-service";

interface FuelCapturePageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tankbeleg scannen · ZeloxTag",
    description: "Tankquittung per KI einlesen und Tankvorgang speichern.",
  };
}

export default async function VehicleFuelCapturePage({
  params,
}: FuelCapturePageProps) {
  const { vehicleId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/tanken/erfassen/tanken/erfassen`,
  });

  if (isDemoShowcase) {
    const { redirect } = await import("next/navigation");
    redirect(`${vehicleSurfaceHref(scope, `tanken`)}`);
  }

  const vehicle = result.vehicle!;
  const vehicleLabel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;
  const fuelScanTier = await loadFuelScanSubscriptionForOwner(vehicle.user_id);

  return (
    <FuelReceiptUploader
      tagUuid={scope.linkedTagUuid ?? vehicleId}
      vehicleId={vehicle.id}
      vehicleLabel={vehicleLabel}
      backHref={`${vehicleSurfaceHref(scope, `tanken`)}`}
      fuelScanTier={fuelScanTier}
    />
  );
}
