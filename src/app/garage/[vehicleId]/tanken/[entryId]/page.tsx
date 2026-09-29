import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FuelManualEntryView } from "@/components/operating-costs/fuel-manual-entry-view";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { fuelOperatingCostToFormState } from "@/lib/vehicles/operating-costs/fuel-entry-form-state";
import { listOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";

interface FuelEntryEditPageProps {
  params: Promise<{ vehicleId: string; entryId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tankvorgang bearbeiten · ZeloxTag",
    description: "Tankvorgang im Verlauf anpassen.",
  };
}

export default async function VehicleFuelEntryEditPage({
  params,
}: FuelEntryEditPageProps) {
  const { vehicleId, entryId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/tanken/[entryId]/tanken/${entryId}`,
  });

  if (isDemoShowcase) {
    const { redirect } = await import("next/navigation");
    redirect(`${vehicleSurfaceHref(scope, `tanken`)}`);
  }

  const vehicle = result.vehicle!;
  const entries = await listOperatingCostsForVehicle(vehicle.id);
  const entry = entries.find(
    (row) => row.id === entryId && row.category === "fuel",
  );
  if (!entry) {
    notFound();
  }

  const vehicleLabel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <FuelManualEntryView
      tagUuid={scope.linkedTagUuid ?? vehicleId}
      vehicleId={vehicle.id}
      vehicleLabel={vehicleLabel}
      backHref={`${vehicleSurfaceHref(scope, `tanken`)}`}
      entryId={entry.id}
      initialForm={fuelOperatingCostToFormState(entry)}
    />
  );
}
