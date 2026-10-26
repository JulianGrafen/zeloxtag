"use client";

import { CalendarClock, Gauge, Tag, Wrench } from "lucide-react";

import {
  IOSListPage,
  InsetGroupedCard,
  InsetListRow,
} from "@/components/ui/ios";
import { serviceCategoryLabel } from "@/lib/service/category-presets";
import type { ServiceRecord } from "@/lib/service/service-record";
import {
  IntervalNotesCard,
  NextIntervalCard,
  OpenInvoiceRow,
} from "@/components/vehicle-dashboard/interval-detail-sections";
import { formatDateDE, formatMileageKm } from "@/utils/formatters";

interface ServiceRecordDetailViewProps {
  record: ServiceRecord;
  vehicleModel: string;
  backHref: string;
  backLabel?: string;
  invoiceHref?: string | null;
}

export function ServiceRecordDetailView({
  record,
  vehicleModel,
  backHref,
  backLabel = "Service",
  invoiceHref,
}: ServiceRecordDetailViewProps) {
  const hasNextInterval =
    record.nextIntervalMileage != null || Boolean(record.nextIntervalDate);

  return (
    <IOSListPage
      title={record.title}
      subtitle={vehicleModel}
      backHref={backHref}
      backLabel={backLabel}
    >
      <InsetGroupedCard>
        <InsetListRow
          icon={Tag}
          iconTone="purple"
          label="Kategorie"
          value={serviceCategoryLabel(record.category)}
        />
        <InsetListRow
          icon={CalendarClock}
          iconTone="blue"
          label="Datum"
          value={formatDateDE(record.date) ?? record.date}
          valueVariant="numeric"
        />
        <InsetListRow
          icon={Gauge}
          iconTone="amber"
          label="Kilometerstand"
          value={formatMileageKm(record.mileage) ?? "—"}
          valueVariant="numeric"
        />
        {record.performedBy ? (
          <InsetListRow
            icon={Wrench}
            iconTone="neutral"
            label="Durchgeführt von"
            value={record.performedBy}
          />
        ) : null}
      </InsetGroupedCard>

      {record.notes ? <IntervalNotesCard notes={record.notes} /> : null}

      {hasNextInterval ? (
        <NextIntervalCard
          nextDueKm={record.nextIntervalMileage}
          nextDueDate={record.nextIntervalDate}
        />
      ) : null}

      {invoiceHref ? (
        <InsetGroupedCard>
          <OpenInvoiceRow href={invoiceHref} />
        </InsetGroupedCard>
      ) : null}
    </IOSListPage>
  );
}
