import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import type { DocumentType } from "@/types/database";

interface UploadPageProps {
  params: Promise<{ uuid: string }>;
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
  const { uuid } = await params;
  const { type: typeRaw, mode } = await searchParams;
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid);
  if (access.isContributor && !access.isOwner && typeRaw === "abe") {
    redirect(`/v/${uuid}?scan=1&type=repair`);
  }

  // Camera / OCR scans always go through the type picker on the dashboard.
  if (!mode || mode === "scan") {
    const suggested =
      typeRaw && VALID_TYPES.has(typeRaw as DocumentType) ? typeRaw : null;
    const qs = suggested
      ? `?scan=1&type=${encodeURIComponent(suggested)}`
      : "?scan=1";
    redirect(`/v/${uuid}${qs}`);
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
    tagUuid: result.tag.uuid,
    feature: FEATURE.DOCUMENT_VAULT,
    children: (
      <AppShell showNavbar={false}>
        <DocumentUploadForm
          vehicleId={vehicle.id}
          tagUuid={result.tag.uuid}
          vehicleLabel={vehicleLabel}
          defaultType={defaultType}
        />
      </AppShell>
    ),
  });
}
