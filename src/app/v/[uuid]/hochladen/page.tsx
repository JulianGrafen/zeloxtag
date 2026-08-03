import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { InvoiceScannerForm } from "@/components/documents/invoice-scanner-form";
import { getVehicleAccess } from "@/lib/auth/vehicle-access";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";
import type { DocumentType } from "@/types/database";

interface UploadPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ type?: string; mode?: string }>;
}

const VALID_TYPES = new Set<DocumentType>(["invoice", "abe", "tuev", "other"]);

export const metadata: Metadata = {
  title: "Dokument scannen · ZeloxTag",
  description:
    "Rechnung fotografieren und per Azure Document Intelligence strukturiert speichern.",
};

export default async function UploadDocumentPage({
  params,
  searchParams,
}: UploadPageProps) {
  const { uuid } = await params;
  const { type: typeRaw, mode } = await searchParams;
  const result = await getTagByUuid(uuid);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  const access = await getVehicleAccess(result.vehicle.user_id);
  if (!access.isOwner) {
    redirect(`/v/${uuid}`);
  }

  // Default scanner lives on the dashboard — keep legacy modes for manual/perspective.
  if (!mode) {
    redirect(`/v/${uuid}?scan=1`);
  }

  const defaultType =
    typeRaw && VALID_TYPES.has(typeRaw as DocumentType)
      ? (typeRaw as DocumentType)
      : "invoice";

  const vehicleLabel = `${result.vehicle.make} ${result.vehicle.model}`;
  const useManual = mode === "manual";
  const usePerspectiveScan = mode === "scan";

  return (
    <AppShell showNavbar={false}>
      {useManual ? (
        <DocumentUploadForm
          vehicleId={result.vehicle.id}
          tagUuid={result.tag.uuid}
          vehicleLabel={vehicleLabel}
          defaultType={defaultType}
        />
      ) : usePerspectiveScan ? (
        <InvoiceScannerForm
          vehicleId={result.vehicle.id}
          tagUuid={result.tag.uuid}
          vehicleLabel={vehicleLabel}
        />
      ) : (
        <InvoiceUploader
          vehicleId={result.vehicle.id}
          tagUuid={result.tag.uuid}
          vehicleLabel={vehicleLabel}
          backHref={`/v/${uuid}`}
          backLabel="Dashboard"
        />
      )}
    </AppShell>
  );
}
