import type { Metadata } from "next";

import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { ManualEntryView } from "@/components/documents/manual-entry-view";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
import { FEATURE } from "@/lib/permissions/feature-access";

interface ManualEntryPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Manuelle Einträge · ZeloxTag",
    description: "Wartungs- und Tuning-Einträge ohne Beleg.",
  };
}

export default async function ManualEntryPage({
  params,
}: ManualEntryPageProps) {
  const { vehicleId } = await params;
  const { scope, result, access, isDemoShowcase } = await requireVehicleSurfaceWriter({ vehicleId });
  const documents =
    access.isContributor && !access.isOwner
      ? result.documents.filter((doc) => doc.type === "invoice")
      : result.documents;

  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: result.vehicle!.user_id,
    tagUuid: scope.linkedTagUuid ?? vehicleId,
    feature: FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    children: (
      <ManualEntryView
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleId={result.vehicle!.id}
        vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
        documents={documents}
      />
    ),
  });
}
