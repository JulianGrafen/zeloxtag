"use client";

import { ChevronRight, X } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  resolveDetailEditLabel,
  resolveDetailEditMenuOrder,
  type InvoiceDetailEditTarget,
} from "@/lib/documents/invoice-detail-edit";

type InvoiceDetailEditPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (target: InvoiceDetailEditTarget) => void;
  isManualEntry?: boolean;
  /** Deep-link to manual entry form with photo picker focused. */
  addPhotosHref?: string | null;
  addPhotosLabel?: string;
};

export function InvoiceDetailEditPickerSheet({
  open,
  onClose,
  onSelect,
  isManualEntry = false,
  addPhotosHref,
  addPhotosLabel = "Bilder hinzufügen",
}: InvoiceDetailEditPickerSheetProps) {
  if (!open) return null;

  const menuOrder = resolveDetailEditMenuOrder(isManualEntry);

  return (
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-neutral-950/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-edit-picker-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.5rem))] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-t-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow)] sm:max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] sm:rounded-[1.5rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-[color:var(--vd-border)] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
              {isManualEntry ? "Eintrag bearbeiten" : "Beleg bearbeiten"}
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

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <ul className="space-y-0.5">
          {addPhotosHref ? (
            <li>
              <PressableLink
                href={addPhotosHref}
                variant="button"
                onClick={onClose}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-[0.92rem] font-medium text-[color:var(--vd-text)] hover:bg-[color:var(--vd-surface-elevated)]"
              >
                {addPhotosLabel}
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
                  aria-hidden
                />
              </PressableLink>
            </li>
          ) : null}
          {menuOrder.map((target) => (
            <li key={target}>
              <PressableButton
                type="button"
                variant="button"
                onClick={() => onSelect(target)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-[0.92rem] font-medium text-[color:var(--vd-text)] hover:bg-[color:var(--vd-surface-elevated)]"
              >
                {resolveDetailEditLabel(target, isManualEntry)}
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
                  aria-hidden
                />
              </PressableButton>
            </li>
          ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
