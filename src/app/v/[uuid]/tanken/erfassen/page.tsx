import type { Metadata } from "next";

import { FuelReceiptUploader } from "@/components/operating-costs/fuel-receipt-uploader";
import { requireTagOwner } from "@/lib/auth/require-tag-access";

interface FuelCapturePageProps {
  params: Promise<{ uuid: string }>;
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
  const { uuid } = await params;
  const { result, isDemoShowcase } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/tanken/erfassen`,
  });

  if (isDemoShowcase) {
    const { redirect } = await import("next/navigation");
    redirect(`/v/${result.tag.uuid}/tanken`);
  }

  const vehicle = result.vehicle!;
  const vehicleLabel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <FuelReceiptUploader
      tagUuid={result.tag.uuid}
      vehicleId={vehicle.id}
      vehicleLabel={vehicleLabel}
      backHref={`/v/${result.tag.uuid}/tanken`}
    />
  );
}
