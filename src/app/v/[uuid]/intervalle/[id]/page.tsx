import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OilIntervalDetailView } from "@/components/vehicle-dashboard";
import { requireTagOwner } from "@/lib/auth/require-tag-owner";
import { oilChangeRecordsFromDocuments } from "@/lib/documents/oil-changes";

interface OilIntervalDetailPageProps {
  params: Promise<{ uuid: string; id: string }>;
}

export async function generateMetadata({
  params,
}: OilIntervalDetailPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `Ölwechsel · ${uuid}`,
    description: "Ölwechsel-Details für diesen ZeloxTag.",
  };
}

export default async function VehicleOilIntervalDetailPage({
  params,
}: OilIntervalDetailPageProps) {
  const { uuid, id } = await params;
  const { result } = await requireTagOwner(uuid);

  const records = oilChangeRecordsFromDocuments(result.documents);
  const record = records.find((entry) => entry.id === id);
  if (!record) {
    notFound();
  }

  const vehicleModel = `${result.vehicle!.make} ${result.vehicle!.model}`;

  return (
    <OilIntervalDetailView
      record={record}
      vehicleModel={vehicleModel}
      backHref={`/v/${result.tag.uuid}/intervalle`}
      invoiceHref={`/v/${result.tag.uuid}/dokumente/${record.id}`}
    />
  );
}
