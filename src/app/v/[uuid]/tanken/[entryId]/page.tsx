import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FuelManualEntryView } from "@/components/operating-costs/fuel-manual-entry-view";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { fuelOperatingCostToFormState } from "@/lib/vehicles/operating-costs/fuel-entry-form-state";
import { listOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";

interface FuelEntryEditPageProps {
  params: Promise<{ uuid: string; entryId: string }>;
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
  const { uuid, entryId } = await params;
  const { result, isDemoShowcase } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/tanken/${entryId}`,
  });

  if (isDemoShowcase) {
    const { redirect } = await import("next/navigation");
    redirect(`/v/${result.tag.uuid}/tanken`);
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
      tagUuid={result.tag.uuid}
      vehicleId={vehicle.id}
      vehicleLabel={vehicleLabel}
      backHref={`/v/${result.tag.uuid}/tanken`}
      entryId={entry.id}
      initialForm={fuelOperatingCostToFormState(entry)}
    />
  );
}
