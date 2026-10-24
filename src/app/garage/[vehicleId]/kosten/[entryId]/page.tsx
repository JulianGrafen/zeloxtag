import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OperatingCostEntryEditView } from "@/components/operating-costs/operating-cost-entry-edit-view";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { operatingCostToFormInput } from "@/lib/vehicles/operating-costs/entry-form-state";
import { listOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";

interface OperatingCostEntryEditPageProps {
  params: Promise<{ vehicleId: string; entryId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kosteneintrag bearbeiten · ZeloxTag",
    description: "Betriebskosten-Eintrag anpassen.",
  };
}

export default async function GarageOperatingCostEntryEditPage({
  params,
}: OperatingCostEntryEditPageProps) {
  const { vehicleId, entryId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner(
    { vehicleId },
    { loginNext: `/garage/${vehicleId}/kosten/${entryId}` },
  );

  if (isDemoShowcase) {
    const { redirect } = await import("next/navigation");
    redirect(vehicleSurfaceHref(scope, "kosten"));
  }

  const vehicle = result.vehicle!;
  const entries = await listOperatingCostsForVehicle(vehicle.id);
  const entry = entries.find((row) => row.id === entryId);
  if (!entry || entry.category === "fuel") {
    notFound();
  }

  const vehicleLabel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <OperatingCostEntryEditView
      tagUuid={scope.linkedTagUuid ?? vehicleId}
      vehicleId={vehicle.id}
      vehicleLabel={vehicleLabel}
      backHref={vehicleSurfaceHref(scope, "kosten")}
      entryId={entry.id}
      initialForm={operatingCostToFormInput(entry)}
    />
  );
}
