import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { InvoiceScannerForm } from "@/components/documents/invoice-scanner-form";
import { requireTagOwner } from "@/lib/auth/require-tag-owner";
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
  const { result } = await requireTagOwner(uuid);

  // Default scanner lives on the dashboard — keep legacy modes for manual/perspective.
  if (!mode) {
    redirect(`/v/${uuid}?scan=1`);
  }

  const defaultType =
    typeRaw && VALID_TYPES.has(typeRaw as DocumentType)
      ? (typeRaw as DocumentType)
      : "invoice";

  const vehicle = result.vehicle!;
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const useManual = mode === "manual";
  const usePerspectiveScan = mode === "scan";

  return (
    <AppShell showNavbar={false}>
      {useManual ? (
        <DocumentUploadForm
          vehicleId={vehicle.id}
          tagUuid={result.tag.uuid}
          vehicleLabel={vehicleLabel}
          defaultType={defaultType}
        />
      ) : usePerspectiveScan ? (
        <InvoiceScannerForm
          vehicleId={vehicle.id}
          tagUuid={result.tag.uuid}
          vehicleLabel={vehicleLabel}
        />
      ) : (
        <InvoiceUploader
          vehicleId={vehicle.id}
          tagUuid={result.tag.uuid}
          vehicleLabel={vehicleLabel}
          backHref={`/v/${uuid}`}
          backLabel="Dashboard"
        />
      )}
    </AppShell>
  );
}
