import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BrakeIntervalDetailView,
  OilIntervalDetailView,
} from "@/components/vehicle-dashboard";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { brakeServiceRecordsFromDocuments } from "@/lib/documents/brake-service";
import {
  oilChangeRecordsFromDocuments,
  resolveOilChangeInterval,
} from "@/lib/documents/oil-changes";
import { isEditableManualOilChangeDocument } from "@/lib/documents/manual-oil-change-form";
import { FEATURE } from "@/lib/permissions/feature-access";
import { getDocumentById } from "@/lib/tags/get-tag-by-uuid";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

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
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid, {
    load: { documents: { mode: "none" } },
  });

  const document = await getDocumentById(result.vehicle!.id, id);
  if (!document) {
    notFound();
  }

  const interval = resolveOilChangeInterval(
    parseVehicleTechSpecs(result.vehicle!.tech_specs),
  );
  const oilRecords = oilChangeRecordsFromDocuments([document], interval);
  const oilRecord = oilRecords.find((entry) => entry.id === id);
  const brakeRecords = brakeServiceRecordsFromDocuments([document]);
  const brakeRecord = brakeRecords.find((entry) => entry.id === id);

  if (!oilRecord && !brakeRecord) {
    notFound();
  }

  const vehicleModel = `${result.vehicle!.make} ${result.vehicle!.model}`;
  const isManualOilLog = isEditableManualOilChangeDocument(document);
  const canEdit =
    access.isOwner ||
    (access.isContributor && document.type === "invoice");

  if (brakeRecord && !oilRecord) {
    return wrapProFeature({
      isDemo: isDemoShowcase,
      ownerUserId: result.vehicle!.user_id,
      tagUuid: result.tag.uuid,
      feature: FEATURE.VIEW_DOCUMENT_VAULT,
      children: (
        <BrakeIntervalDetailView
          record={brakeRecord}
          document={document}
          vehicleModel={vehicleModel}
          backHref={`/v/${result.tag.uuid}/intervalle?tab=bremsen`}
          invoiceHref={`/v/${result.tag.uuid}/dokumente/${brakeRecord.id}`}
        />
      ),
    });
  }

  const record = oilRecord!;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: result.tag.uuid,
    feature: FEATURE.VIEW_DOCUMENT_VAULT,
    children: (
      <OilIntervalDetailView
        record={record}
        document={document}
        vehicleModel={vehicleModel}
        backHref={`/v/${result.tag.uuid}/intervalle`}
        invoiceHref={
          isManualOilLog
            ? null
            : `/v/${result.tag.uuid}/dokumente/${record.id}`
        }
        tagUuid={result.tag.uuid}
        vehicleId={result.vehicle!.id}
        canEdit={canEdit}
        isManualOilLog={isManualOilLog}
      />
    ),
  });
}
