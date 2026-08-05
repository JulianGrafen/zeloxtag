import type { Metadata } from "next";

import { VehicleDocumentsView } from "@/components/documents/vehicle-documents-view";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { parseInvoiceListCategory } from "@/lib/documents/invoice-categories";
import type { DocumentType } from "@/types/database";

interface DocumentsPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ type?: string; category?: string }>;
}

const VALID_TYPES = new Set<DocumentType | "all">([
  "all",
  "invoice",
  "abe",
  "tuev",
  "other",
]);

export async function generateMetadata({
  params,
}: DocumentsPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `Dokumente · ${uuid}`,
    description: "Fahrzeugdokumente für diesen ZeloxTag.",
  };
}

export default async function VehicleDocumentsPage({
  params,
  searchParams,
}: DocumentsPageProps) {
  const { uuid } = await params;
  const { type: typeRaw, category: categoryRaw } = await searchParams;
  const { result, access } = await requireTagWriter(uuid);
  // Schrauber: invoice list only (no ABE / TÜV browsing).
  const contributorLocked =
    access.isContributor && !access.isOwner
      ? ("invoice" as const)
      : null;

  const requested =
    typeRaw && VALID_TYPES.has(typeRaw as DocumentType | "all")
      ? (typeRaw as DocumentType | "all")
      : "all";
  const filterType = contributorLocked ?? requested;
  const documents = contributorLocked
    ? result.documents.filter((doc) => doc.type === "invoice")
    : result.documents;
  const invoiceCategory = parseInvoiceListCategory(categoryRaw) ?? "all";

  return (
    <VehicleDocumentsView
      tagUuid={result.tag.uuid}
      vehicleId={result.vehicle!.id}
      vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
      vehicleModel={result.vehicle!.model}
      documents={documents}
      filterType={filterType}
      invoiceCategory={invoiceCategory}
      canWrite
    />
  );
}
