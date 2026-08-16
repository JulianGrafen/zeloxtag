import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocumentAbeDetailView } from "@/components/documents/document-abe-detail-view";
import { DocumentInvoiceDetailView } from "@/components/documents/document-invoice-detail-view";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { getDocumentById } from "@/lib/tags/get-tag-by-uuid";

interface DocumentDetailPageProps {
  params: Promise<{ uuid: string; id: string }>;
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
  const { uuid, id } = await params;
  const { result, access } = await requireTagWriter(uuid);

  const document =
    (await getDocumentById(result.vehicle!.id, id)) ??
    result.documents.find((doc) => doc.id === id);
  if (!document) {
    notFound();
  }

  // Schrauber may open invoices only (history already filtered in requireTagWriter).
  if (
    access.isContributor &&
    !access.isOwner &&
    document.type !== "invoice"
  ) {
    redirect(`/v/${uuid}/dokumente?type=invoice`);
  }

  const vehicleLabel = `${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`;

  if (document.type === "abe") {
    return (
      <DocumentAbeDetailView
        tagUuid={result.tag.uuid}
        vehicleLabel={vehicleLabel}
        document={document}
      />
    );
  }

  return (
    <DocumentInvoiceDetailView
      tagUuid={result.tag.uuid}
      vehicleLabel={vehicleLabel}
      document={document}
      canEdit={
        access.isOwner ||
        (access.isContributor && document.type === "invoice")
      }
      canDelete={access.isOwner}
    />
  );
}
