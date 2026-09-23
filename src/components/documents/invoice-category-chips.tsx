"use client";

import {
  INVOICE_REVIEW_CATEGORIES,
  INVOICE_REVIEW_CATEGORY_LABELS,
  type InvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";

type InvoiceCategoryChipsProps = {
  value: string | null | undefined;
  onChange: (category: InvoiceReviewCategory) => void;
  disabled?: boolean;
  className?: string;
};

export function InvoiceCategoryChips({
  value,
  onChange,
  disabled = false,
  className = "",
}: InvoiceCategoryChipsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {INVOICE_REVIEW_CATEGORIES.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={[
              "rounded-full px-3.5 py-2 text-[0.82rem] font-medium transition-colors disabled:opacity-50",
              active
                ? "bg-neutral-900 text-white"
                : "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]",
            ].join(" ")}
          >
            {INVOICE_REVIEW_CATEGORY_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
