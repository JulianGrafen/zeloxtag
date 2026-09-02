import type { Metadata } from "next";

import { ManualEntryView } from "@/components/documents/manual-entry-view";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { FEATURE } from "@/lib/permissions/feature-access";

interface UmbautenPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Umbauten · ZeloxTag",
    description: "Umbau- und Tuning-Historie mit Fotos durchsuchen.",
  };
}

export default async function UmbautenPage({ params }: UmbautenPageProps) {
  const { uuid } = await params;
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid, {
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "invoice",
      },
    },
  });
  const documents =
    access.isContributor && !access.isOwner
      ? result.documents.filter((doc) => doc.type === "invoice")
      : result.documents;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: result.tag.uuid,
    feature: FEATURE.VIEW_DOCUMENT_VAULT,
    children: (
      <ManualEntryView
        tagUuid={result.tag.uuid}
        vehicleId={result.vehicle!.id}
        vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
        documents={documents}
        variant="umbau"
        heading="Umbau-Bilder"
        subheading="Fotos von Tuning & Umbauten"
      />
    ),
  });
}
