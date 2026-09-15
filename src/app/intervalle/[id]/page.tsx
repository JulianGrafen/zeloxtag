import { notFound } from "next/navigation";

import { OilIntervalDetailView } from "@/components/vehicle-dashboard/OilIntervalDetailView";
import { getOilChangeRecord } from "@/components/vehicle-dashboard/oilChangeRecords";
import type { Document } from "@/types/database";

interface OilIntervalDetailPageProps {
  params: Promise<{ id: string }>;
}

function demoDocumentForRecord(recordId: string): Document {
  return {
    id: recordId,
    vehicle_id: "demo-vehicle",
    user_id: "demo",
    created_by: "demo",
    title: "Ölwechsel",
    type: "invoice",
    file_url: "/demo/oil.pdf",
    vendor: null,
    category: "service",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: null,
    manufacturer: null,
    invoice_number: null,
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: null,
    date: null,
    created_at: new Date().toISOString(),
  };
}

export default async function OilIntervalDetailPage({
  params,
}: OilIntervalDetailPageProps) {
  const { id } = await params;
  const record = getOilChangeRecord(id);

  if (!record) {
    notFound();
  }

  return (
    <OilIntervalDetailView
      record={record}
      document={demoDocumentForRecord(record.id)}
      vehicleModel="328i"
      tagUuid="demo"
      vehicleId="demo-vehicle"
      canEdit={false}
      isManualOilLog={false}
    />
  );
}
