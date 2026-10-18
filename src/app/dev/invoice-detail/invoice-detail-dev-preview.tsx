"use client";

import { Suspense } from "react";

import { DocumentInvoiceDetailView } from "@/components/documents/document-invoice-detail-view";
import type { Document } from "@/types/database";

const MOCK_TAG = "demo-active-tag";
const MOCK_VEHICLE_ID = "11111111-1111-4111-8111-111111111111";

const MOCK_INVOICE: Document = {
  id: "doc-dev-invoice-001",
  vehicle_id: MOCK_VEHICLE_ID,
  user_id: "22222222-2222-4222-8222-222222222222",
  created_by: "22222222-2222-4222-8222-222222222222",
  title: "Inspektion · ATU Stuttgart",
  type: "invoice",
  file_url: "/demo/dyno-e36.svg",
  vendor: "ATU Stuttgart-Vaihingen",
  category: "service",
  line_items: [
    { label: "Inspektion nach Herstellervorgabe", amount: 189 },
    { label: "Motoröl 5W-30 (5 L)", amount: 74.5 },
    { label: "Ölfilter", amount: 24.9 },
    { label: "Arbeitszeit", amount: 102 },
  ],
  kba_number: null,
  vehicle_approvals: null,
  authority: null,
  conditions: null,
  part_category: null,
  notes: "Mock-Beleg für UI-Review — keine echten Daten.",
  page_count: 1,
  manufacturer: null,
  invoice_number: "RE-2025-88421",
  mileage_km: 187_430,
  technical_specs: null,
  approval_fields: null,
  amount: 428.9,
  date: "2025-11-14",
  show_on_public_showcase: false,
  show_on_build_story: false,
  created_at: "2025-11-14T16:42:00.000Z",
};

function InvoiceDetailDevPreviewInner() {
  return (
    <DocumentInvoiceDetailView
      tagUuid={MOCK_TAG}
      vehicleLabel="Volkswagen Golf 7 R · 2016"
      document={MOCK_INVOICE}
      backHref="/dev/invoice-detail"
      canEdit
      canDelete={false}
    />
  );
}

export function InvoiceDetailDevPreview() {
  return (
    <Suspense fallback={null}>
      <div className="relative">
        <p className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white/90">
          Dev · Belegdetail Mock
        </p>
        <InvoiceDetailDevPreviewInner />
      </div>
    </Suspense>
  );
}
