"use client";

import { IOSListPage, InsetGroupedCard } from "@/components/ui/ios";
import { resolveDocumentMileageKm } from "@/lib/documents/document-mileage";
import type { Document } from "@/types/database";

import type { BrakeServiceRecord } from "./brakeServiceRecords";
import {
  IntervalNotesCard,
  IntervalStatusCard,
  NextIntervalCard,
  OpenInvoiceRow,
  intervalRuleFooter,
} from "./interval-detail-sections";

interface BrakeIntervalDetailViewProps {
  record: BrakeServiceRecord;
  document: Document;
  vehicleModel: string;
  backHref?: string;
  backLabel?: string;
  invoiceHref?: string | null;
}

export function BrakeIntervalDetailView({
  record,
  document,
  vehicleModel,
  backHref = "/intervalle",
  backLabel = "Service",
  invoiceHref,
}: BrakeIntervalDetailViewProps) {
  const mileageDisplay = resolveDocumentMileageKm(document) ?? record.mileageKm;
  const subtitle = [record.date, vehicleModel, record.workshop]
    .filter(Boolean)
    .join(" · ");

  return (
    <IOSListPage
      title="Bremsbeläge"
      subtitle={subtitle}
      backHref={backHref}
      backLabel={backLabel}
    >
      <IntervalStatusCard
        status={record.status}
        mileageKm={mileageDisplay}
        intervalKm={record.intervalKm}
      />

      <NextIntervalCard
        nextDueKm={record.nextDueKm}
        nextDueDate={record.nextDueDate}
        partNumber={record.partNumber}
        footer={intervalRuleFooter(record)}
      />

      {record.notes ? <IntervalNotesCard notes={record.notes} /> : null}

      {invoiceHref ? (
        <InsetGroupedCard>
          <OpenInvoiceRow href={invoiceHref} />
        </InsetGroupedCard>
      ) : null}
    </IOSListPage>
  );
}
