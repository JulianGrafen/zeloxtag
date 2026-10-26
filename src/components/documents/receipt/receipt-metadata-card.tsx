"use client";

import {
  Building2,
  Calendar,
  Gauge,
  Hash,
  Tag,
  Type,
  type LucideIcon,
} from "lucide-react";
import { Fragment, type ReactNode } from "react";

import {
  InsetGroupedCard,
  InsetListRow,
  InsetListRowLayoutProvider,
  type IconBadgeTone,
  type InsetListRowValueVariant,
} from "@/components/ui/ios";
import {
  formatDateDE,
  formatInvoiceNumber,
  formatMileageKm,
  restoreGermanUmlauts,
} from "@/utils/formatters";

export type ReceiptMetadataField =
  | "title"
  | "amount"
  | "vendor"
  | "category"
  | "date"
  | "mileage"
  | "invoiceNumber";

export type ReceiptMetadata = {
  title?: string | null;
  vendor?: string | null;
  vendorLabel?: string;
  category?: string | null;
  date?: string | null;
  mileageKm?: number | null;
  invoiceNumber?: string | null;
};

type ReadOnlyFieldSpec = {
  label: string;
  icon: LucideIcon;
  tone: IconBadgeTone;
  valueVariant: InsetListRowValueVariant;
  resolve: (metadata: ReceiptMetadata) => string | null;
};

const FIELD_ORDER: readonly ReceiptMetadataField[] = [
  "title",
  "vendor",
  "category",
  "date",
  "mileage",
  "invoiceNumber",
  "amount",
];

const READ_ONLY_FIELDS: Partial<Record<ReceiptMetadataField, ReadOnlyFieldSpec>> = {
  title: {
    label: "Bezeichnung",
    icon: Type,
    tone: "neutral",
    valueVariant: "text",
    resolve: (metadata) => {
      const title = metadata.title?.trim();
      if (!title || title === metadata.vendor?.trim()) return null;
      return restoreGermanUmlauts(title);
    },
  },
  vendor: {
    label: "Werkstatt",
    icon: Building2,
    tone: "blue",
    valueVariant: "text",
    resolve: (metadata) => metadata.vendor?.trim() || null,
  },
  category: {
    label: "Kategorie",
    icon: Tag,
    tone: "purple",
    valueVariant: "text",
    resolve: (metadata) => metadata.category?.trim() || null,
  },
  date: {
    label: "Datum",
    icon: Calendar,
    tone: "red",
    valueVariant: "numeric",
    resolve: (metadata) => formatDateDE(metadata.date),
  },
  mileage: {
    label: "Kilometerstand",
    icon: Gauge,
    tone: "green",
    valueVariant: "numeric",
    resolve: (metadata) => formatMileageKm(metadata.mileageKm),
  },
  invoiceNumber: {
    label: "Belegnummer",
    icon: Hash,
    tone: "neutral",
    valueVariant: "mono",
    resolve: (metadata) => formatInvoiceNumber(metadata.invoiceNumber),
  },
};

type ReceiptMetadataCardProps = {
  metadata: ReceiptMetadata;
  /** Field-level overrides (e.g. inline editors); take precedence over read-only rows. */
  editableRows?: Partial<Record<ReceiptMetadataField, ReactNode>>;
  /** Appended after the standard rows (e.g. Zahlung, Fahrzeug). */
  extraRows?: ReactNode;
  header?: string;
};

export function ReceiptMetadataCard({
  metadata,
  editableRows = {},
  extraRows,
  header = "Details",
}: ReceiptMetadataCardProps) {
  const rows = FIELD_ORDER.flatMap((field) => {
    const editable = editableRows[field];
    if (editable) return [<Fragment key={field}>{editable}</Fragment>];

    const spec = READ_ONLY_FIELDS[field];
    const value = spec?.resolve(metadata);
    if (!spec || !value) return [];

    return [
      <InsetListRow
        key={field}
        icon={spec.icon}
        iconTone={spec.tone}
        label={field === "vendor" && metadata.vendorLabel ? metadata.vendorLabel : spec.label}
        value={value}
        valueVariant={spec.valueVariant}
      />,
    ];
  });

  if (rows.length === 0 && !extraRows) return null;

  return (
    <InsetGroupedCard header={header}>
      <InsetListRowLayoutProvider layout="stacked">
        {rows}
        {extraRows}
      </InsetListRowLayoutProvider>
    </InsetGroupedCard>
  );
}