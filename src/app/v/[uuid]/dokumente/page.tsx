import type { Metadata } from "next";

import { VehicleDocumentsView } from "@/components/documents/vehicle-documents-view";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { requireTagWriter } from "@/lib/auth/require-tag-access";
import { parseInvoiceListCategory } from "@/lib/documents/invoice-categories";
import { FEATURE } from "@/lib/permissions/feature-access";
import type { TagLoadOptions } from "@/lib/tags/get-tag-by-uuid";
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

function documentLoadForFilter(
  filterType: DocumentType | "all",
): TagLoadOptions {
  if (filterType === "all") {
    return { documents: { mode: "all", columns: "list" } };
  }
  return {
    documents: {
      mode: "types",
      types: [filterType],
      columns: filterType === "invoice" ? "invoice" : "list",
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Dokumente · ZeloxTag",
    description: "Fahrzeugdokumente für diesen ZeloxTag.",
  };
}

export default async function VehicleDocumentsPage({
  params,
  searchParams,
}: DocumentsPageProps) {
  const { uuid } = await params;
  const { type: typeRaw, category: categoryRaw } = await searchParams;
  const requested =
    typeRaw && VALID_TYPES.has(typeRaw as DocumentType | "all")
      ? (typeRaw as DocumentType | "all")
      : "all";
  const { result, access, isDemoShowcase } = await requireTagWriter(uuid, {
    loginNext: `/v/${uuid}/dokumente${typeRaw ? `?type=${typeRaw}` : ""}`,
    load: documentLoadForFilter(requested),
  });
  // Schrauber: invoice list only (no ABE / TÜV browsing).
  const contributorLocked =
    access.isContributor && !access.isOwner
      ? ("invoice" as const)
      : null;
  const filterType = contributorLocked ?? requested;
  const documentsScope =
    requested === "all" && !contributorLocked ? ("all" as const) : ("filtered" as const);
  const documents = contributorLocked
    ? result.documents.filter((doc) => doc.type === "invoice")
    : result.documents;
  const invoiceCategory = parseInvoiceListCategory(categoryRaw) ?? "all";

  const view = (
    <VehicleDocumentsView
      tagUuid={result.tag.uuid}
      vehicleId={result.vehicle!.id}
      vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
      vehicleModel={result.vehicle!.model}
      documents={documents}
      filterType={filterType}
      documentsScope={documentsScope}
      invoiceCategory={invoiceCategory}
      canWrite={!isDemoShowcase && access.canWriteInvoices}
    />
  );

  if (isDemoShowcase) return view;

  return (
    <ProFeatureGate
      ownerUserId={result.vehicle!.user_id}
      tagUuid={result.tag.uuid}
      feature={FEATURE.DOCUMENT_VAULT}
      isContributor={access.isContributor && !access.isOwner}
    >
      {view}
    </ProFeatureGate>
  );
}
