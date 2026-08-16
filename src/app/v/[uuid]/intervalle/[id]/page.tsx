import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OilIntervalDetailView } from "@/components/vehicle-dashboard";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { oilChangeRecordsFromDocuments } from "@/lib/documents/oil-changes";

interface OilIntervalDetailPageProps {
  params: Promise<{ uuid: string; id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Ölwechsel · ZeloxTag",
    description: "Ölwechsel-Details für diesen ZeloxTag.",
  };
}

export default async function VehicleOilIntervalDetailPage({
  params,
}: OilIntervalDetailPageProps) {
  const { uuid, id } = await params;
  const { result } = await requireTagWriter(uuid);

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
