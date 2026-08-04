import type { Metadata } from "next";

import { VehicleDocumentsView } from "@/components/documents/vehicle-documents-view";
import { requireTagOwner } from "@/lib/auth/require-tag-owner";
import type { DocumentType } from "@/types/database";

interface DocumentsPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ type?: string }>;
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
  const { type: typeRaw } = await searchParams;
  const { result } = await requireTagOwner(uuid);

  const filterType =
    typeRaw && VALID_TYPES.has(typeRaw as DocumentType | "all")
      ? (typeRaw as DocumentType | "all")
      : "all";

  return (
    <VehicleDocumentsView
      tagUuid={result.tag.uuid}
      vehicleId={result.vehicle!.id}
      vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
      vehicleModel={result.vehicle!.model}
      documents={result.documents}
      filterType={filterType}
      canWrite
    />
  );
}
