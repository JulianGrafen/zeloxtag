import type { Metadata } from "next";

import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { ManualEntryView } from "@/components/documents/manual-entry-view";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { FEATURE } from "@/lib/permissions/feature-access";

interface ManualEntryPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Wartung & Tuning · ZeloxTag",
    description: "Eigene Wartungs- und Tuning-Einträge ohne Beleg.",
  };
}

export default async function ManualEntryPage({
  params,
}: ManualEntryPageProps) {
  const { uuid } = await params;
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid);
  const documents =
    access.isContributor && !access.isOwner
      ? result.documents.filter((doc) => doc.type === "invoice")
      : result.documents;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: result.tag.uuid,
    feature: FEATURE.DOCUMENT_VAULT,
    children: (
      <ManualEntryView
        tagUuid={result.tag.uuid}
        vehicleId={result.vehicle!.id}
        vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
        documents={documents}
      />
    ),
  });
}
