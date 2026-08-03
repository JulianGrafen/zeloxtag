import { notFound } from "next/navigation";

import { InvoiceDetailView } from "@/components/vehicle-dashboard/InvoiceDetailView";
import { getInvoiceDocument } from "@/components/vehicle-dashboard/invoiceDocuments";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { id } = await params;
  const document = getInvoiceDocument(id);

  if (!document) {
    notFound();
  }

  return (
    <InvoiceDetailView document={document} vehicleModel="RX-8" />
  );
}
