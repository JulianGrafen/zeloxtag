import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OperatingCostEntryEditView } from "@/components/operating-costs/operating-cost-entry-edit-view";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { operatingCostToFormInput } from "@/lib/vehicles/operating-costs/entry-form-state";
import { listOperatingCostsForVehicle } from "@/lib/vehicles/load-operating-costs";

interface OperatingCostEntryEditPageProps {
  params: Promise<{ uuid: string; entryId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kosteneintrag bearbeiten · ZeloxTag",
    description: "Betriebskosten-Eintrag anpassen.",
  };
}

export default async function VehicleOperatingCostEntryEditPage({
  params,
}: OperatingCostEntryEditPageProps) {
  const { uuid, entryId } = await params;
  const { result, isDemoShowcase } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/kosten/${entryId}`,
  });

  if (isDemoShowcase) {
    const { redirect } = await import("next/navigation");
    redirect(`/v/${result.tag.uuid}/kosten`);
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
      tagUuid={result.tag.uuid}
      vehicleId={vehicle.id}
      vehicleLabel={vehicleLabel}
      backHref={`/v/${result.tag.uuid}/kosten`}
      entryId={entry.id}
      initialForm={operatingCostToFormInput(entry)}
    />
  );
}
