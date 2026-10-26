"use client";

import { Receipt } from "lucide-react";
import type { ReactNode } from "react";

import { InsetGroupedCard, InsetListRow } from "@/components/ui/ios";
import { formatDateDE, formatMileageKm } from "@/utils/formatters";

import {
  IntervalRecordStatusPill,
  type IntervalRecordStatus,
} from "./service-status-pill";

const EMPTY_VALUE = "—";

type IntervalRuleRecord = {
  intervalKm: number;
  intervalMonths: number;
  nextDueDate: string;
  kmBasedEstimate?: boolean;
  kmPerDay?: number | null;
};

/** Footer copy for oil/brake intervals: rule plus the optional mileage-based estimate. */
export function intervalRuleFooter(record: IntervalRuleRecord): string {
  const rule = `Intervall: alle ${formatMileageKm(record.intervalKm) ?? EMPTY_VALUE} oder ${record.intervalMonths} Monate.`;
  if (!record.kmBasedEstimate || record.kmPerDay == null) return rule;
  const kmPerDay = record.kmPerDay.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
  });
  return `${rule} Fälligkeitsdatum ca. ${record.nextDueDate} — basierend auf Ø ${kmPerDay} km/Tag aus deinen Belegen.`;
}

export function IntervalStatusCard({
  status,
  mileageKm,
  intervalKm,
}: {
  status: IntervalRecordStatus;
  mileageKm?: number | null;
  intervalKm: number;
}) {
  return (
    <InsetGroupedCard>
      <InsetListRow
        label="Status"
        trailing={<IntervalRecordStatusPill status={status} />}
      />
      {mileageKm != null ? (
        <InsetListRow
          label="Kilometerstand"
          value={formatMileageKm(mileageKm) ?? EMPTY_VALUE}
          valueVariant="numeric"
        />
      ) : null}
      <InsetListRow
        label="Intervall"
        value={formatMileageKm(intervalKm) ?? EMPTY_VALUE}
        valueVariant="numeric"
      />
    </InsetGroupedCard>
  );
}

export function NextIntervalCard({
  nextDueKm,
  nextDueDate,
  partNumber,
  footer,
}: {
  nextDueKm: number | null;
  nextDueDate: string | null;
  partNumber?: string | null;
  footer?: ReactNode;
}) {
  return (
    <InsetGroupedCard header="Nächstes Intervall" footer={footer}>
      {nextDueKm != null ? (
        <InsetListRow
          label="km-Ziel"
          value={formatMileageKm(nextDueKm) ?? EMPTY_VALUE}
          valueVariant="numeric"
        />
      ) : null}
      {nextDueDate ? (
        <InsetListRow
          label="Spätestens"
          value={formatDateDE(nextDueDate) ?? nextDueDate}
          valueVariant="numeric"
        />
      ) : null}
      {partNumber?.trim() ? (
        <InsetListRow
          label="Teilenummer (Beleg-OCR)"
          value={partNumber}
          valueVariant="mono"
        />
      ) : null}
    </InsetGroupedCard>
  );
}

export function IntervalNotesCard({
  id,
  notes,
}: {
  id?: string;
  notes: string;
}) {
  return (
    <InsetGroupedCard id={id} header="Notiz" className="scroll-mt-24">
      <p className="whitespace-pre-line px-4 py-3 text-[15px] leading-relaxed text-white">
        {notes}
      </p>
    </InsetGroupedCard>
  );
}

export function OpenInvoiceRow({
  href,
  label = "Beleg öffnen",
}: {
  href: string;
  label?: string;
}) {
  return (
    <InsetListRow
      href={href}
      icon={Receipt}
      iconTone="blue"
      emphasis="navigation"
      label={label}
    />
  );
}
