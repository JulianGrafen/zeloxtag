import type { Metadata } from "next";

import { ManualEntryView } from "@/components/documents/manual-entry-view";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { scopeFromGarageRoute } from "@/lib/vehicle-surface/paths";

interface UmbautenPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Umbauten · ZeloxTag",
    description: "Umbau- und Tuning-Historie mit Fotos durchsuchen.",
  };
}

export default async function UmbautenPage({ params }: UmbautenPageProps) {
  const { vehicleId } = await params;
  const garageNavScope = scopeFromGarageRoute(vehicleId);
  const { scope, result, access, isDemoShowcase } = await requireVehicleSurfaceWriter({ vehicleId }, {
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
    tagUuid: scope.linkedTagUuid ?? vehicleId,
    vehicleSurfaceScope: garageNavScope,
    feature: FEATURE.VIEW_DOCUMENT_VAULT,
    children: (
      <ManualEntryView
        tagUuid={scope.linkedTagUuid ?? vehicleId}
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
