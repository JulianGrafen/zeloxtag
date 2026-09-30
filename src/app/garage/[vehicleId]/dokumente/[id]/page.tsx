import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocumentAbeDetailView } from "@/components/documents/document-abe-detail-view";
import { DocumentInvoiceDetailView } from "@/components/documents/document-invoice-detail-view";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
import { isManualVehicleEntry } from "@/lib/documents/manual-entries";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { FEATURE } from "@/lib/permissions/feature-access";
import { getDocumentById } from "@/lib/tags/get-tag-by-uuid";

interface DocumentDetailPageProps {
  params: Promise<{ vehicleId: string; id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Dokument · ZeloxTag",
    description: "Detailansicht mit extrahierten Feldern und Original-PDF.",
  };
}

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { vehicleId, id } = await params;
  const { scope, result, access, isDemoShowcase } = await requireVehicleSurfaceWriter({ vehicleId }, {
    load: { documents: { mode: "none" } },
  });

  const document = await getDocumentById(result.vehicle!.id, id);
  if (!document) {
    notFound();
  }

  // Schrauber may open invoices only (history already filtered in requireVehicleSurfaceWriter).
  if (
    access.isContributor &&
    !access.isOwner &&
    document.type !== "invoice"
  ) {
    redirect(`${vehicleSurfaceHref(scope, `dokumente?type=invoice`)}`);
  }

  const vehicleLabel = `${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`;
  const membershipActive = await userHasActiveMembership(result.vehicle!.user_id);
  const manualEntry = isManualVehicleEntry(document);
  const canManageDocument =
    membershipActive || (access.isOwner && manualEntry);

  const view =
    document.type === "abe" ? (
      <>
        <DocumentAbeDetailView
          tagUuid={scope.linkedTagUuid ?? vehicleId}
          vehicleLabel={vehicleLabel}
          document={document}
        />
      </>
    ) : (
      <>
        <DocumentInvoiceDetailView
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleLabel={vehicleLabel}
        document={document}
        canEdit={
          canManageDocument &&
          (access.isOwner ||
            (access.isContributor && document.type === "invoice"))
        }
        canDelete={access.isOwner && canManageDocument}
      />
      </>
    );

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: scope.linkedTagUuid ?? vehicleId,
    feature: FEATURE.VIEW_DOCUMENT_VAULT,
    children: view,
  });
}
