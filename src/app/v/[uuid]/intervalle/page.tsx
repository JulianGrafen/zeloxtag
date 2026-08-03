import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OilIntervalsView } from "@/components/vehicle-dashboard";
import { oilChangeRecordsFromDocuments } from "@/lib/documents/oil-changes";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";

interface OilIntervalsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata({
  params,
}: OilIntervalsPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `Ölwechsel-Intervalle · ${uuid}`,
    description: "Ölwechsel-Historie und Intervalle für diesen ZeloxTag.",
  };
}

export default async function VehicleOilIntervalsPage({
  params,
}: OilIntervalsPageProps) {
  const { uuid } = await params;
  const result = await getTagByUuid(uuid);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  const records = oilChangeRecordsFromDocuments(result.documents);
  const vehicleModel = `${result.vehicle.make} ${result.vehicle.model}`;

  return (
    <OilIntervalsView
      vehicleModel={vehicleModel}
      records={records}
      backHref={`/v/${result.tag.uuid}`}
      basePath={`/v/${result.tag.uuid}/intervalle`}
      scanHref={`/v/${result.tag.uuid}?scan=1`}
    />
  );
}
