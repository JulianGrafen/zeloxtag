import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BrakeIntervalDetailView,
  OilIntervalDetailView,
} from "@/components/vehicle-dashboard";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
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
  params: Promise<{ vehicleId: string; id: string }>;
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
  const { vehicleId, id } = await params;
  const { scope, result, access, isDemoShowcase } = await requireVehicleSurfaceWriter({ vehicleId }, {
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
      tagUuid: scope.linkedTagUuid ?? vehicleId,
      feature: FEATURE.VIEW_DOCUMENT_VAULT,
      children: (
        <BrakeIntervalDetailView
          record={brakeRecord}
          document={document}
          vehicleModel={vehicleModel}
          backHref={`${vehicleSurfaceHref(scope, `intervalle?tab=bremsen`)}`}
          invoiceHref={`${vehicleSurfaceHref(scope, `dokumente/${brakeRecord.id}`)}`}
        />
      ),
    });
  }

  const record = oilRecord!;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: scope.linkedTagUuid ?? vehicleId,
    feature: FEATURE.VIEW_DOCUMENT_VAULT,
    children: (
      <OilIntervalDetailView
        record={record}
        document={document}
        vehicleModel={vehicleModel}
        backHref={`${vehicleSurfaceHref(scope, `intervalle`)}`}
        invoiceHref={
          isManualOilLog
            ? null
            : `${vehicleSurfaceHref(scope, `dokumente/${record.id}`)}`
        }
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleId={result.vehicle!.id}
        canEdit={canEdit}
        isManualOilLog={isManualOilLog}
      />
    ),
  });
}
