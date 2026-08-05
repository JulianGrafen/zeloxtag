import type { Metadata } from "next";

import { OilIntervalsView } from "@/components/vehicle-dashboard";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { oilChangeRecordsFromDocuments } from "@/lib/documents/oil-changes";

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
  const { result } = await requireTagWriter(uuid);

  const records = oilChangeRecordsFromDocuments(result.documents);
  const vehicleModel = `${result.vehicle!.make} ${result.vehicle!.model}`;

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
