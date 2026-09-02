import type { Metadata } from "next";

import { ServiceInspectionsView } from "@/components/documents/service-inspections-view";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { FEATURE } from "@/lib/permissions/feature-access";

interface ServicePageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Service & Wartung · ZeloxTag",
    description: "Inspektionen und Servicebelege für diesen ZeloxTag.",
  };
}

export default async function ServiceInspectionsPage({
  params,
  searchParams,
}: ServicePageProps) {
  const { uuid } = await params;
  const { scan } = await searchParams;
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid);
  const documents =
    access.isContributor && !access.isOwner
      ? result.documents.filter((doc) => doc.type === "invoice")
      : result.documents;
  const membershipActive = await userHasActiveMembership(result.vehicle!.user_id);

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: result.tag.uuid,
    feature: FEATURE.VIEW_DOCUMENT_VAULT,
    isContributor: access.isContributor && !access.isOwner,
    children: (
      <ServiceInspectionsView
        tagUuid={result.tag.uuid}
        vehicleId={result.vehicle!.id}
        vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
        documents={documents}
        initialScan={scan === "1" && membershipActive}
        canManageDocuments={membershipActive}
      />
    ),
  });
}
