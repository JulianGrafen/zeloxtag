import { Building2, Calendar } from "lucide-react";
import type { ReactNode } from "react";

import { AdaptiveDocumentDetailTitle } from "@/components/documents/adaptive-document-detail-title";
import { IOS_CARD } from "@/components/ui/ios";
import { cn } from "@/lib/utils";
import { formatCurrencyEUR } from "@/utils/formatters";

type ReceiptHeroProps = {
  /** Plain string gets the adaptive display title; pass a node for inline editing. */
  title: ReactNode;
  amount: number | null;
  categoryLabel?: string | null;
  vendor?: string | null;
  dateLabel?: string | null;
  /** Optional status chip (e.g. „Bezahlt“) below the meta line. */
  status?: ReactNode;
};

/** Beleg header card: kicker, display title with the total beside it, vendor and date below. */
export function ReceiptHero({
  title,
  amount,
  categoryLabel,
  vendor,
  dateLabel,
  status,
}: ReceiptHeroProps) {
  const vendorText = vendor?.trim();
  const dateText = dateLabel?.trim();

  return (
    <header className={cn(IOS_CARD, "p-5")}>
      {categoryLabel ? (
        <p className="font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8E8E93]">
          {categoryLabel}
        </p>
      ) : null}

      <div className={cn("flex items-start justify-between gap-4", categoryLabel && "mt-1.5")}>
        <div className="min-w-0 flex-1">
          {typeof title === "string" ? (
            <AdaptiveDocumentDetailTitle hasTrailingAside>{title}</AdaptiveDocumentDetailTitle>
          ) : (
            title
          )}
        </div>
        <p className="shrink-0 whitespace-nowrap pt-1 text-right text-[1.3rem] font-bold leading-snug tracking-[-0.02em] tabular-nums text-white">
          {amount !== null ? formatCurrencyEUR(amount) : "—"}
        </p>
      </div>

      {vendorText || dateText ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#8E8E93]">
          {vendorText ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="truncate">{vendorText}</span>
            </span>
          ) : null}
          {dateText ? (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              {dateText}
            </span>
          ) : null}
        </div>
      ) : null}

      {status ? <div className="mt-3 flex flex-wrap gap-1.5">{status}</div> : null}
    </header>
  );
}
