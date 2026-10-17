"use client";

import { useState } from "react";

import { InvoiceReviewForm } from "@/components/documents/invoice-review-form";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

const MOCK_FIELDS: InvoiceTextParseResult = {
  vendor: "ATU Stuttgart-Vaihingen",
  date: "2025-11-14",
  amount: 428.9,
  category: "service",
  summary: "Inspektion inkl. Ölwechsel",
  topicTags: ["service", "bremsen"],
  lineItems: [
    { label: "Inspektion nach Herstellervorgabe", amount: 189.0 },
    { label: "Motoröl 5W-30 (5 L)", amount: 74.5 },
    { label: "Ölfilter", amount: 24.9 },
    { label: "Bremsflüssigkeit DOT 4", amount: 38.5 },
    { label: "Arbeitszeit", amount: 102.0 },
  ],
  kbaNumber: null,
  vehicleApprovals: null,
  authority: null,
  conditions: null,
  partCategory: null,
  notes: null,
  manufacturer: null,
  invoiceNumber: "RE-2025-88421",
  mileageKm: 187430,
};

export function InvoiceReviewDevPreview() {
  const [title, setTitle] = useState("Inspektion 187.430 km · ATU");
  const [fields, setFields] = useState<InvoiceTextParseResult>(MOCK_FIELDS);

  return (
    <div className="min-h-dvh bg-[color:var(--vd-surface)] px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        <header className="space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Dev · Mock
          </p>
          <h1 className="text-[1.15rem] font-semibold text-[color:var(--vd-text)]">
            Beleg-Review nach Scan
          </h1>
          <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
            Porsche 911 · 992 Carrera S
          </p>
        </header>

        <InvoiceReviewForm
          title={title}
          onTitleChange={setTitle}
          fields={fields}
          onFieldsChange={(patch) =>
            setFields((current) => ({ ...current, ...patch }))
          }
          mileageWarning="Der KM-Stand liegt 12.400 km über dem letzten Eintrag."
          onSave={() => {
            window.alert("Mock: Beleg speichern");
          }}
          onSaveDespiteMileage={() => {
            window.alert("Mock: Trotzdem speichern");
          }}
        />
      </div>
    </div>
  );
}
