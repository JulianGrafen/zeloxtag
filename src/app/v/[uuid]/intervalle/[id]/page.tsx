import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OilIntervalDetailView } from "@/components/vehicle-dashboard";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { oilChangeRecordsFromDocuments } from "@/lib/documents/oil-changes";
import { FEATURE } from "@/lib/permissions/feature-access";
import { getDocumentById } from "@/lib/tags/get-tag-by-uuid";

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
  const { result, isDemoShowcase } = await requireTagWriter(uuid, {
    load: { documents: { mode: "none" } },
  });

  const document = await getDocumentById(result.vehicle!.id, id);
  if (!document) {
    notFound();
  }

  const records = oilChangeRecordsFromDocuments([document]);
  const record = records.find((entry) => entry.id === id);
  if (!record) {
    notFound();
  }

  const vehicleModel = `${result.vehicle!.make} ${result.vehicle!.model}`;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: result.tag.uuid,
    feature: FEATURE.VIEW_DOCUMENT_VAULT,
    children: (
      <OilIntervalDetailView
        record={record}
        vehicleModel={vehicleModel}
        backHref={`/v/${result.tag.uuid}/intervalle`}
        invoiceHref={`/v/${result.tag.uuid}/dokumente/${record.id}`}
      />
    ),
  });
}
