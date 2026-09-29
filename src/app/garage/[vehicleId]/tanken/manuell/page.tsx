import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";

import { FuelManualEntryView } from "@/components/operating-costs/fuel-manual-entry-view";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";

interface FuelManualEntryPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tankvorgang eintragen · ZeloxTag",
    description: "Tankvorgang manuell ohne Beleg-Scan erfassen.",
  };
}

export default async function VehicleFuelManualEntryPage({
  params,
}: FuelManualEntryPageProps) {
  const { vehicleId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/tanken/manuell/tanken/manuell`,
  });

  if (isDemoShowcase) {
    const { redirect } = await import("next/navigation");
    redirect(`${vehicleSurfaceHref(scope, `tanken`)}`);
  }

  const vehicle = result.vehicle!;
  const vehicleLabel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <FuelManualEntryView
      tagUuid={scope.linkedTagUuid ?? vehicleId}
      vehicleId={vehicle.id}
      vehicleLabel={vehicleLabel}
      backHref={`${vehicleSurfaceHref(scope, `tanken`)}`}
    />
  );
}
