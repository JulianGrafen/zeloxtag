"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Pencil } from "lucide-react";

import { EditableLineItemsSection } from "@/components/documents/editable-line-items-section";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatCompactGermanDate,
  formatDocumentAmount,
  formatMileageKmLabel,
} from "@/lib/documents/format";
import {
  INVOICE_REVIEW_CATEGORIES,
  INVOICE_REVIEW_CATEGORY_LABELS,
  type InvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

export type InvoiceReviewFormProps = {
  title: string;
  onTitleChange: (value: string) => void;
  fields: InvoiceTextParseResult;
  onFieldsChange: (patch: Partial<InvoiceTextParseResult>) => void;
  categoryLocked?: boolean;
  vehicleMismatchReason?: string | null;
  mileageWarning?: string | null;
  duplicateHint?: string | null;
  preview?: {
    url: string;
    kind: "pdf" | "image";
    pageCount: number;
    fileSizeLabel: string;
  };
  saving?: boolean;
  error?: string | null;
  onSave: () => void;
  onSaveDespiteMismatch?: () => void;
  onSaveDespiteMileage?: () => void;
  onSaveDespiteDuplicate?: () => void;
  onReset?: () => void;
  topBanner?: ReactNode;
  onDismissMismatch?: () => void;
  onDismissDuplicate?: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InvoiceReviewForm({
  title,
  onTitleChange,
  fields,
  onFieldsChange,
  categoryLocked = false,
  vehicleMismatchReason = null,
  mileageWarning = null,
  duplicateHint = null,
  preview,
  saving = false,
  error = null,
  onSave,
  onSaveDespiteMismatch,
  onSaveDespiteMileage,
  onSaveDespiteDuplicate,
  onReset,
  topBanner,
  onDismissMismatch,
  onDismissDuplicate,
}: InvoiceReviewFormProps) {
  const [editingHeader, setEditingHeader] = useState(false);

  const amountLabel =
    formatDocumentAmount(fields.amount ?? null) ?? "—";
  const dateLabel = fields.date
    ? formatCompactGermanDate(fields.date) || "—"
    : "—";
  const categoryLabel = INVOICE_REVIEW_CATEGORY_LABELS[
    fields.category as InvoiceReviewCategory
  ];

  return (
    <div className="space-y-4">
      {topBanner}

      {vehicleMismatchReason ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-[0.85rem] text-amber-950">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Anderes Fahrzeug erkannt?
          </p>
          <p className="mt-1.5 leading-relaxed">{vehicleMismatchReason}</p>
        </div>
      ) : null}

      {mileageWarning ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-[0.85rem] text-amber-950">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Kilometerstand prüfen
          </p>
          <p className="mt-1.5 leading-relaxed">{mileageWarning}</p>
        </div>
      ) : null}

      {duplicateHint ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-[0.85rem] text-amber-950">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Mögliches Duplikat
          </p>
          <p className="mt-1.5 leading-relaxed">{duplicateHint}</p>
        </div>
      ) : null}

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Belegdaten
          </h2>
          {!editingHeader ? (
            <PressableButton
              type="button"
              variant="button"
              onClick={() => setEditingHeader(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-1.5 text-[0.72rem] font-medium text-[color:var(--vd-text)]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Bearbeiten
            </PressableButton>
          ) : null}
        </div>

        {!editingHeader ? (
          <button
            type="button"
            onClick={() => setEditingHeader(true)}
            className="w-full space-y-3 text-left"
          >
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-[color:var(--vd-border)] pb-4">
              <div>
                <dt className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Betrag
                </dt>
                <dd className="mt-0.5 text-[0.95rem] tabular-nums text-[color:var(--vd-text)]">
                  {amountLabel}
                </dd>
              </div>
              <div>
                <dt className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Datum
                </dt>
                <dd className="mt-0.5 text-[0.95rem] text-[color:var(--vd-text)]">
                  {dateLabel}
                </dd>
              </div>
            </dl>
            <div className="space-y-2 text-[0.88rem] text-[color:var(--vd-text)]">
              <p>
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Werkstatt ·{" "}
                </span>
                {fields.vendor?.trim() || "—"}
              </p>
              <p>
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Bezeichnung ·{" "}
                </span>
                {title.trim() || "—"}
              </p>
              <p>
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Kilometerstand ·{" "}
                </span>
                {formatMileageKmLabel(fields.mileageKm)}
              </p>
              {!categoryLocked ? (
                <p>
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                    Kategorie ·{" "}
                  </span>
                  {categoryLabel}
                </p>
              ) : null}
              {fields.invoiceNumber?.trim() ? (
                <p>
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                    Belegnummer ·{" "}
                  </span>
                  {fields.invoiceNumber.trim()}
                </p>
              ) : null}
            </div>
          </button>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3 border-b border-[color:var(--vd-border)] pb-4">
              <label className="block min-w-0 space-y-1">
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Betrag
                </span>
                <Input
                  inputMode="decimal"
                  value={
                    fields.amount === null || fields.amount === undefined
                      ? ""
                      : String(fields.amount)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    if (!raw) {
                      onFieldsChange({ amount: null });
                      return;
                    }
                    const value = Number.parseFloat(raw.replace(",", "."));
                    if (Number.isFinite(value)) {
                      onFieldsChange({ amount: value });
                    }
                  }}
                  placeholder="0,00"
                  className="tabular-nums"
                />
              </label>
              <label className="block w-[9.5rem] space-y-1">
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Datum
                </span>
                <GermanDateInput
                  value={fields.date}
                  onChange={(iso) => onFieldsChange({ date: iso })}
                  className="claim-input"
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block space-y-1">
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Werkstatt
                </span>
                <Input
                  value={fields.vendor ?? ""}
                  onChange={(event) =>
                    onFieldsChange({ vendor: event.target.value || null })
                  }
                  placeholder="Name der Werkstatt"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Bezeichnung
                </span>
                <Input
                  required
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  placeholder="z. B. Inspektion 60.000 km"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Kilometerstand
                </span>
                <MileageKmInput
                  value={fields.mileageKm ?? null}
                  onChange={(km) => onFieldsChange({ mileageKm: km })}
                  className="claim-input"
                  placeholder="z. B. 187.430"
                />
              </label>

              {!categoryLocked ? (
                <div className="space-y-1.5">
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                    Kategorie
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {INVOICE_REVIEW_CATEGORIES.map((option) => {
                      const active = fields.category === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            onFieldsChange({
                              category: option as InvoiceReviewCategory,
                            })
                          }
                          className={[
                            "rounded-full px-3.5 py-2 text-[0.82rem] font-medium transition-colors",
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
                </div>
              ) : null}

              <details className="group rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/60 px-3 py-2.5">
                <summary className="cursor-pointer list-none text-[0.8rem] font-medium text-[color:var(--vd-muted)] marker:content-none [&::-webkit-details-marker]:hidden">
                  Weitere Angaben
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                      Belegnummer
                    </span>
                    <Input
                      value={fields.invoiceNumber ?? ""}
                      onChange={(event) =>
                        onFieldsChange({
                          invoiceNumber: event.target.value || null,
                        })
                      }
                      placeholder="optional"
                    />
                  </label>
                </div>
              </details>
            </div>

            <PressableButton
              type="button"
              variant="button"
              onClick={() => setEditingHeader(false)}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[color:var(--vd-border)] px-3 py-2.5 text-[0.85rem] font-medium text-[color:var(--vd-text)]"
            >
              Fertig
            </PressableButton>
          </>
        )}
      </section>

      <EditableLineItemsSection
        items={fields.lineItems ?? []}
        totalAmount={fields.amount}
        emptyHint="Positionen manuell ergänzen."
        onChange={(lineItems) =>
          onFieldsChange({
            lineItems: lineItems.length ? lineItems : null,
          })
        }
      />

      {preview ? (
        <details className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
          <summary className="cursor-pointer px-4 py-3 text-[0.82rem] font-medium text-[color:var(--vd-text)]">
            Scan-Vorschau · {preview.pageCount}{" "}
            {preview.pageCount === 1 ? "Seite" : "Seiten"} ·{" "}
            {preview.fileSizeLabel || formatBytes(0)}
          </summary>
          <div className="border-t border-[color:var(--vd-border)]">
            {preview.kind === "pdf" ? (
              <iframe
                title="Dokumentvorschau"
                src={preview.url}
                className="max-h-[32vh] w-full border-0 bg-neutral-100"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={preview.url}
                alt="Dokumentvorschau"
                className="max-h-[32vh] w-full bg-neutral-100 object-contain"
              />
            )}
            {onReset ? (
              <div className="border-t border-[color:var(--vd-border)] px-4 py-2.5">
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[0.78rem] font-medium text-[color:var(--vd-muted)] underline-offset-2 hover:underline"
                >
                  Scan verwerfen und neu starten
                </button>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {error ? (
        <p role="alert" className="vd-alert-error">
          {error}
        </p>
      ) : null}

      {vehicleMismatchReason && onSaveDespiteMismatch ? (
        <div className="space-y-2">
          <Button
            type="button"
            disabled={saving}
            className="claim-cta w-full"
            onClick={onSaveDespiteMismatch}
          >
            {saving ? "Wird gespeichert…" : "Trotzdem speichern"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className="w-full"
            onClick={onDismissMismatch ?? onSave}
          >
            Zurück
          </Button>
        </div>
      ) : duplicateHint && onSaveDespiteDuplicate ? (
        <div className="space-y-2">
          <Button
            type="button"
            disabled={saving}
            className="claim-cta w-full"
            onClick={onSaveDespiteDuplicate}
          >
            {saving ? "Wird gespeichert…" : "Trotzdem als neuen Beleg speichern"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className="w-full"
            onClick={onDismissDuplicate ?? onSave}
          >
            Abbrechen
          </Button>
        </div>
      ) : mileageWarning && onSaveDespiteMileage ? (
        <div className="space-y-2">
          <Button
            type="button"
            disabled={saving}
            className="claim-cta w-full"
            onClick={onSaveDespiteMileage}
          >
            {saving ? "Wird gespeichert…" : "Trotzdem speichern"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className="w-full"
            onClick={onSave}
          >
            KM korrigieren
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          disabled={saving}
          className="claim-cta w-full"
          onClick={onSave}
        >
          {saving ? "Wird gespeichert…" : "Beleg speichern"}
        </Button>
      )}
    </div>
  );
}
