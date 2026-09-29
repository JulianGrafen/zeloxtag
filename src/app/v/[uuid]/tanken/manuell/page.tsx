import type { Metadata } from "next";

import { FuelManualEntryView } from "@/components/operating-costs/fuel-manual-entry-view";
import { requireTagOwner } from "@/lib/auth/require-tag-access";

interface FuelManualEntryPageProps {
  params: Promise<{ uuid: string }>;
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
  const { uuid } = await params;
  const { result, isDemoShowcase } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/tanken/manuell`,
  });

  if (isDemoShowcase) {
    const { redirect } = await import("next/navigation");
    redirect(`/v/${result.tag.uuid}/tanken`);
  }

  const vehicle = result.vehicle!;
  const vehicleLabel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <FuelManualEntryView
      tagUuid={result.tag.uuid}
      vehicleId={vehicle.id}
      vehicleLabel={vehicleLabel}
      backHref={`/v/${result.tag.uuid}/tanken`}
    />
  );
}
