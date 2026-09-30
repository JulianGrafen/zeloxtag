import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { requireVehicleSurfaceWriter } from "@/lib/auth/require-vehicle-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import {
  scopeFromGarageRoute,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";
import type { DocumentType } from "@/types/database";

interface UploadPageProps {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ type?: string; mode?: string }>;
}

const VALID_TYPES = new Set<DocumentType>(["invoice", "abe", "tuev", "other"]);

export const metadata: Metadata = {
  title: "Dokument scannen · ZeloxTag",
  description: "Rechnung oder Beleg fotografieren und speichern.",
};

export default async function UploadDocumentPage({
  params,
  searchParams,
}: UploadPageProps) {
  const { vehicleId } = await params;
  const garageNavScope = scopeFromGarageRoute(vehicleId);
  const { type: typeRaw, mode } = await searchParams;
  const { scope, result, access, isDemoShowcase } = await requireVehicleSurfaceWriter({ vehicleId });
  if (access.isContributor && !access.isOwner && typeRaw === "abe") {
    redirect(`${vehicleSurfaceHref(garageNavScope, `?scan=1&type=repair`)}`);
  }

  // Camera / OCR scans always go through the type picker on the dashboard.
  if (!mode || mode === "scan") {
    const suggested =
      typeRaw && VALID_TYPES.has(typeRaw as DocumentType) ? typeRaw : null;
    const qs = suggested
      ? `?scan=1&type=${encodeURIComponent(suggested)}`
      : "?scan=1";
    redirect(`${vehicleSurfaceHref(garageNavScope, `${qs}`)}`);
  }

  const defaultType =
    typeRaw && VALID_TYPES.has(typeRaw as DocumentType)
      ? (typeRaw as DocumentType)
      : "invoice";

  const vehicle = result.vehicle!;
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;

  // Manual upload still asks for type inside DocumentUploadForm.
  return wrapProFeature({
    isDemo: isDemoShowcase,
    ownerUserId: vehicle.user_id,
    tagUuid: scope.linkedTagUuid ?? vehicleId,
    vehicleSurfaceScope: garageNavScope,
    feature: FEATURE.DOCUMENT_VAULT,
    children: (
      <AppShell showNavbar={false}>
        <DocumentUploadForm
          vehicleId={vehicle.id}
          tagUuid={scope.linkedTagUuid ?? vehicleId}
          vehicleSurfaceScope={garageNavScope}
          vehicleLabel={vehicleLabel}
          defaultType={defaultType}
          lockType={defaultType === "invoice" ? "invoice" : undefined}
          backHref={vehicleSurfaceHref(garageNavScope,
            defaultType === "invoice"
              ? "dokumente?type=invoice"
              : "dokumente",
          )}
        />
      </AppShell>
    ),
  });
}
