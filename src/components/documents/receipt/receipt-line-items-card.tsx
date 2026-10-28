"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { InsetGroupedCard, TelemetryValue } from "@/components/ui/ios";
import {
  formatVatRateLabel,
  resolveInvoiceTotals,
  type InvoiceTotals,
} from "@/lib/documents/invoice-totals";
import { cn } from "@/lib/utils";
import {
  formatCurrencyEUR,
  formatInvoicePositionLabel,
} from "@/utils/formatters";

/** Positions shown before the „Alle X Positionen anzeigen“ toggle. */
export const RECEIPT_COLLAPSED_LINE_LIMIT = 6;

export type ReceiptLineItem = {
  label: string;
  amount: number;
};

type ReceiptLineItemsCardProps = {
  items: readonly ReceiptLineItem[];
  total: number | null;
  emptyHint?: string;
};

type SummaryRow = {
  label: string;
  amount: number;
  emphasis: boolean;
};

function summaryRows(totals: InvoiceTotals | null): SummaryRow[] {
  if (!totals) return [];
  switch (totals.kind) {
    case "net-lines":
    case "gross-lines":
      return [
        { label: "Zwischensumme (Netto)", amount: totals.net, emphasis: false },
        {
          label: `MwSt. (${formatVatRateLabel(totals.vatRate)})`,
          amount: totals.vat,
          emphasis: false,
        },
        { label: "Gesamtbetrag", amount: totals.gross, emphasis: true },
      ];
    case "unreconciled":
      return [
        { label: "Summe Positionen", amount: totals.lineSum, emphasis: false },
        { label: "Gesamtbetrag", amount: totals.gross, emphasis: true },
      ];
    case "lines-only":
      return [{ label: "Summe Positionen", amount: totals.lineSum, emphasis: true }];
    case "total-only":
      return [{ label: "Gesamtbetrag", amount: totals.gross, emphasis: true }];
  }
}

function LineItemRow({ item }: { item: ReceiptLineItem }) {
  const label = formatInvoicePositionLabel(item.label);

  return (
    <li className="relative flex items-start justify-between gap-3 px-4 py-2.5 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-white/[0.08] last:after:hidden">
      <p className="min-w-0 flex-1 text-[15px] leading-snug text-white [overflow-wrap:anywhere]">
        {label}
      </p>
      <TelemetryValue value={formatCurrencyEUR(item.amount)} className="pt-px text-[15px]" />
    </li>
  );
}

export function ReceiptLineItemsCard({
  items,
  total,
  emptyHint = "Keine Positionen erkannt.",
}: ReceiptLineItemsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const totals = useMemo(
    () =>
      resolveInvoiceTotals({
        total,
        lineAmounts: items.map((item) => item.amount),
      }),
    [items, total],
  );

  if (items.length === 0) {
    return (
      <InsetGroupedCard header="Positionen">
        <p className="px-4 py-3 text-sm text-[#8E8E93]">{emptyHint}</p>
      </InsetGroupedCard>
    );
  }

  const collapsible = items.length > RECEIPT_COLLAPSED_LINE_LIMIT;
  const visibleItems =
    collapsible && !expanded
      ? items.slice(0, RECEIPT_COLLAPSED_LINE_LIMIT)
      : items;
  const footer =
    totals?.kind === "unreconciled"
      ? "Die Summe der erkannten Positionen weicht vom Gesamtbetrag ab."
      : undefined;

  return (
    <InsetGroupedCard header="Positionen" footer={footer}>
      <ul>
        {visibleItems.map((item, index) => (
          <LineItemRow key={`${item.label}-${index}`} item={item} />
        ))}
      </ul>

      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-center gap-1 border-t border-white/[0.08] px-4 py-2.5 text-sm font-medium text-[#0A84FF] active:bg-[#2C2C2E]"
        >
          {expanded ? "Weniger anzeigen" : `Alle ${items.length} Positionen anzeigen`}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : null}

      <dl className="space-y-1.5 border-t border-white/10 px-4 py-3">
        {summaryRows(totals).map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt
              className={
                row.emphasis
                  ? "text-base font-semibold text-white"
                  : "text-sm text-[#8E8E93]"
              }
            >
              {row.label}
            </dt>
            <dd
              className={cn(
                "tabular-nums",
                row.emphasis
                  ? "text-base font-semibold text-white"
                  : "text-sm text-[#8E8E93]",
              )}
            >
              {formatCurrencyEUR(row.amount)}
            </dd>
          </div>
        ))}
      </dl>
    </InsetGroupedCard>
  );
}
