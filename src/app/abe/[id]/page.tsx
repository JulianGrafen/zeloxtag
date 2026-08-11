import { notFound } from "next/navigation";

import { AbeDocumentDetailView } from "@/components/vehicle-dashboard/AbeDocumentDetailView";
import { getAbeDocument } from "@/components/vehicle-dashboard/abeDocuments";

interface AbeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AbeDetailPage({ params }: AbeDetailPageProps) {
  const { id } = await params;
  const document = getAbeDocument(id);

  if (!document) {
    notFound();
  }

  return (
    <AbeDocumentDetailView document={document} vehicleModel="328i" />
  );
}
