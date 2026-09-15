"use client";

import { ChevronRight, X } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  INVOICE_DETAIL_EDIT_MENU_ORDER,
  INVOICE_DETAIL_EDIT_LABELS,
  type InvoiceDetailEditTarget,
} from "@/lib/documents/invoice-detail-edit";

type InvoiceDetailEditPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (target: InvoiceDetailEditTarget) => void;
  manualEditHref?: string | null;
};

export function InvoiceDetailEditPickerSheet({
  open,
  onClose,
  onSelect,
  manualEditHref,
}: InvoiceDetailEditPickerSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-neutral-950/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-edit-picker-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow)] sm:rounded-[1.5rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-[color:var(--vd-border)] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
              Beleg bearbeiten
            </p>
            <h2
              id="invoice-edit-picker-title"
              className="mt-1 font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
            >
              Was möchtest du ändern?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <ul className="overflow-y-auto px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {INVOICE_DETAIL_EDIT_MENU_ORDER.map((target) => (
            <li key={target}>
              <PressableButton
                type="button"
                variant="button"
                onClick={() => onSelect(target)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-[0.92rem] font-medium text-[color:var(--vd-text)] hover:bg-[color:var(--vd-surface-elevated)]"
              >
                {INVOICE_DETAIL_EDIT_LABELS[target]}
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
                  aria-hidden
                />
              </PressableButton>
            </li>
          ))}
          {manualEditHref ? (
            <li className="mt-1 border-t border-[color:var(--vd-border)] pt-1">
              <PressableLink
                href={manualEditHref}
                variant="button"
                onClick={onClose}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-[0.92rem] font-medium text-[color:var(--vd-text)] hover:bg-[color:var(--vd-surface-elevated)]"
              >
                Komplett bearbeiten
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
                  aria-hidden
                />
              </PressableLink>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
