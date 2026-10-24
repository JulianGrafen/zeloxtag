import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BrakeIntervalDetailView,
  OilIntervalDetailView,
} from "@/components/vehicle-dashboard";
import { ServiceRecordDetailView } from "@/components/service-book";
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
import { loadServiceHistoryForVehicle } from "@/lib/service/load-service-history";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

interface ServiceRecordDetailPageProps {
  params: Promise<{ uuid: string; id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Service · ZeloxTag",
    description: "Service-Details für diesen ZeloxTag.",
  };
}

export default async function VehicleServiceRecordDetailPage({
  params,
}: ServiceRecordDetailPageProps) {
  const { uuid, id } = await params;
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid, {
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "invoice",
      },
    },
  });

  const records = await loadServiceHistoryForVehicle(
    result.vehicle!.id,
    result.documents,
    result.vehicle!.tech_specs,
  );
  const serviceRecord =
    records.find((entry) => entry.id === id) ??
    records.find((entry) => entry.invoiceDocumentId === id);

  const document =
    (await getDocumentById(result.vehicle!.id, id)) ??
    (serviceRecord?.invoiceDocumentId
      ? await getDocumentById(result.vehicle!.id, serviceRecord.invoiceDocumentId)
      : null);

  const vehicleModel = `${result.vehicle!.make} ${result.vehicle!.model}`;
  const backHref = `/v/${result.tag.uuid}/intervalle`;

  if (serviceRecord && !document) {
    return wrapProFeature({
      isDemo: isDemoShowcase,
      ownerUserId: result.vehicle!.user_id,
      tagUuid: result.tag.uuid,
      feature: FEATURE.VIEW_DOCUMENT_VAULT,
      children: (
        <ServiceRecordDetailView
          record={serviceRecord}
          vehicleModel={vehicleModel}
          backHref={backHref}
        />
      ),
    });
  }

  if (!document) {
    notFound();
  }

  const interval = resolveOilChangeInterval(
    parseVehicleTechSpecs(result.vehicle!.tech_specs),
  );
  const oilRecords = oilChangeRecordsFromDocuments([document], interval);
  const oilRecord = oilRecords.find((entry) => entry.id === document.id);
  const brakeRecords = brakeServiceRecordsFromDocuments([document]);
  const brakeRecord = brakeRecords.find((entry) => entry.id === document.id);

  if (!oilRecord && !brakeRecord && !serviceRecord) {
    notFound();
  }

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
          backHref={backHref}
          invoiceHref={`/v/${result.tag.uuid}/dokumente/${brakeRecord.id}`}
        />
      ),
    });
  }

  if (oilRecord) {
    const record = oilRecord;
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
          backHref={backHref}
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

  if (serviceRecord) {
    return wrapProFeature({
      isDemo: isDemoShowcase,
      ownerUserId: result.vehicle!.user_id,
      tagUuid: result.tag.uuid,
      feature: FEATURE.VIEW_DOCUMENT_VAULT,
      children: (
        <ServiceRecordDetailView
          record={serviceRecord}
          vehicleModel={vehicleModel}
          backHref={backHref}
          invoiceHref={`/v/${result.tag.uuid}/dokumente/${document.id}`}
        />
      ),
    });
  }

  notFound();
}
