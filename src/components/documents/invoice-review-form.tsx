"use client";

import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { DocumentUpload } from "@/components/dashboard/DocumentUpload";
import { EditableLineItemsSection } from "@/components/documents/editable-line-items-section";
import { GermanAmountInput } from "@/components/documents/german-amount-input";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import {
  MANUAL_ENTRY_CONTROL_CLASS,
  ManualEntryFieldRow,
  PRIMARY_PILL_BUTTON_CLASS,
} from "@/components/documents/manual-entry-form-sections";
import { Button } from "@/components/ui/button";
import {
  GarageField,
  GarageFieldCell,
  GarageFieldDisclosureSummary,
  GarageFieldRow,
  GarageInsetInput,
} from "@/components/ui/garage-field";
import { InsetGroupedCard } from "@/components/ui/ios";
import { EntryTopicChips } from "@/components/documents/entry-topic-chips";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";
import { InvoiceCategoryChips } from "@/components/documents/invoice-category-chips";
import { ScanDocumentPreview } from "@/components/documents/scan-document-preview";
import { recalculateInvoiceGrossAmount } from "@/lib/ocr/invoice-vat";
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
  /** Manual Beleg (no OCR) — copy tweaks + optional file picker. */
  manualEntry?: boolean;
  filePicker?: {
    disabled?: boolean;
    label: string;
    onReady: (results: { file: File }[]) => void;
  };
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
  manualEntry = false,
  filePicker,
}: InvoiceReviewFormProps) {
  const topicCount = fields.topicTags?.length ?? 0;
  const disclosureHintClassName =
    "text-[0.82rem] font-normal text-[color:var(--vd-muted)]";

  const lineItemsEditor = (
    <EditableLineItemsSection
      items={fields.lineItems ?? []}
      totalAmount={fields.amount}
      mode="inline"
      hideHeading={manualEntry}
      emptyHint="Positionen manuell ergänzen."
      onChange={(lineItems) => {
        const nextItems = lineItems.length ? lineItems : null;
        onFieldsChange({
          lineItems: nextItems,
          amount: recalculateInvoiceGrossAmount(nextItems, {
            hintAmount: fields.amount,
          }),
        });
      }}
    />
  );

  const savePrimaryButton = (
    label: string,
    onClick: () => void,
  ) =>
    manualEntry ? (
      <PressableButton
        type="button"
        variant="button"
        disabled={saving}
        className={PRIMARY_PILL_BUTTON_CLASS}
        onClick={onClick}
      >
        {label}
      </PressableButton>
    ) : (
      <Button
        type="button"
        disabled={saving}
        className="claim-cta w-full"
        onClick={onClick}
      >
        {label}
      </Button>
    );

  return (
    <div className={manualEntry ? "flex flex-col gap-6" : "space-y-4"}>
      {topBanner}

      {vehicleMismatchReason ? (
        <div role="alert" className="vd-alert-warning">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Anderes Fahrzeug erkannt?
          </p>
          <p className="mt-1.5 leading-relaxed">{vehicleMismatchReason}</p>
        </div>
      ) : null}

      {mileageWarning ? (
        <div role="alert" className="vd-alert-warning">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Kilometerstand prüfen
          </p>
          <p className="mt-1.5 leading-relaxed">{mileageWarning}</p>
        </div>
      ) : null}

      {duplicateHint ? (
        <div role="alert" className="vd-alert-warning">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Mögliches Duplikat
          </p>
          <p className="mt-1.5 leading-relaxed">{duplicateHint}</p>
        </div>
      ) : null}

      {manualEntry ? (
        <>
          <InsetGroupedCard header="Belegdaten">
            <ManualEntryFieldRow label="Betrag (€)" htmlFor="invoice-review-amount">
              <GermanAmountInput
                id="invoice-review-amount"
                variant="inset"
                value={fields.amount ?? null}
                onChange={(amount) => onFieldsChange({ amount })}
                placeholder="0,00"
                className={cn(MANUAL_ENTRY_CONTROL_CLASS, "tabular-nums")}
              />
            </ManualEntryFieldRow>
            <ManualEntryFieldRow label="Datum" htmlFor="invoice-review-date">
              <GermanDateInput
                id="invoice-review-date"
                variant="inset"
                value={fields.date}
                onChange={(iso) => onFieldsChange({ date: iso })}
                className={cn(MANUAL_ENTRY_CONTROL_CLASS, "tabular-nums")}
              />
            </ManualEntryFieldRow>
            <ManualEntryFieldRow label="Bezeichnung" htmlFor="invoice-review-title">
              <GarageInsetInput
                id="invoice-review-title"
                required
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="z. B. Inspektion 60.000 km"
                className={MANUAL_ENTRY_CONTROL_CLASS}
              />
            </ManualEntryFieldRow>
            <ManualEntryFieldRow label="Kilometerstand" htmlFor="invoice-review-km">
              <MileageKmInput
                id="invoice-review-km"
                variant="inset"
                value={fields.mileageKm ?? null}
                onChange={(km) => onFieldsChange({ mileageKm: km })}
                placeholder="z. B. 187.430"
                className={cn(MANUAL_ENTRY_CONTROL_CLASS, "tabular-nums")}
              />
            </ManualEntryFieldRow>
            {!categoryLocked ? (
              <div className="border-t border-white/[0.08] px-4 py-3">
                <span className="mb-2 block text-xs font-medium text-[#8E8E93]">
                  Kategorie
                </span>
                <InvoiceCategoryChips
                  value={fields.category}
                  onChange={(category) => onFieldsChange({ category })}
                />
              </div>
            ) : null}
          </InsetGroupedCard>

          <InsetGroupedCard header="Details">
            <ManualEntryFieldRow label="Werkstatt" htmlFor="invoice-review-vendor">
              <GarageInsetInput
                id="invoice-review-vendor"
                value={fields.vendor ?? ""}
                onChange={(event) =>
                  onFieldsChange({ vendor: event.target.value || null })
                }
                placeholder="Name der Werkstatt"
                className={MANUAL_ENTRY_CONTROL_CLASS}
              />
            </ManualEntryFieldRow>
            <ManualEntryFieldRow label="Belegnr." htmlFor="invoice-review-invoice-number">
              <GarageInsetInput
                id="invoice-review-invoice-number"
                value={fields.invoiceNumber ?? ""}
                onChange={(event) =>
                  onFieldsChange({
                    invoiceNumber: event.target.value || null,
                  })
                }
                placeholder="optional"
                className={MANUAL_ENTRY_CONTROL_CLASS}
              />
            </ManualEntryFieldRow>
          </InsetGroupedCard>

          <InsetGroupedCard
            header="Themen"
            footer="Optional — z. B. Reifen, Fahrwerk, Bremsen."
          >
            <div className="px-4 py-3">
              <EntryTopicChips
                compact
                value={fields.topicTags ?? []}
                onChange={(topicTags) => onFieldsChange({ topicTags })}
              />
            </div>
          </InsetGroupedCard>

          <InsetGroupedCard header="Positionen">
            <div className="px-3 pb-3 pt-1">{lineItemsEditor}</div>
          </InsetGroupedCard>
        </>
      ) : (
        <section className="zt-feature-panel p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
          <h2 className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Belegdaten
          </h2>

          <div className="grid gap-4">
            <GarageFieldRow>
              <GarageFieldCell label="Betrag" htmlFor="invoice-review-amount">
                <GermanAmountInput
                  id="invoice-review-amount"
                  variant="inset"
                  value={fields.amount ?? null}
                  onChange={(amount) => onFieldsChange({ amount })}
                  placeholder="0,00"
                />
              </GarageFieldCell>
              <GarageFieldCell label="Datum" htmlFor="invoice-review-date">
                <GermanDateInput
                  id="invoice-review-date"
                  variant="inset"
                  value={fields.date}
                  onChange={(iso) => onFieldsChange({ date: iso })}
                />
              </GarageFieldCell>
            </GarageFieldRow>

            <GarageField label="Bezeichnung" htmlFor="invoice-review-title">
              <GarageInsetInput
                id="invoice-review-title"
                required
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="z. B. Inspektion 60.000 km"
              />
            </GarageField>

            <GarageField label="Kilometerstand" htmlFor="invoice-review-km">
              <MileageKmInput
                id="invoice-review-km"
                variant="inset"
                value={fields.mileageKm ?? null}
                onChange={(km) => onFieldsChange({ mileageKm: km })}
                placeholder="z. B. 187.430"
              />
            </GarageField>

            {!categoryLocked ? (
              <GarageField label="Kategorie" htmlFor="invoice-review-category">
                <div
                  id="invoice-review-category"
                  className="garage-field__control min-h-[1.75rem] py-1.5"
                >
                  <InvoiceCategoryChips
                    value={fields.category}
                    onChange={(category) => onFieldsChange({ category })}
                  />
                </div>
              </GarageField>
            ) : null}

            <details className="garage-field-row-shell group">
              <GarageFieldDisclosureSummary label="Details">
                <span className={disclosureHintClassName}>Optional ergänzen</span>
              </GarageFieldDisclosureSummary>
              <div className="garage-disclosure-body">
                <GarageFieldRow>
                  <GarageFieldCell label="Werkstatt" htmlFor="invoice-review-vendor">
                    <GarageInsetInput
                      id="invoice-review-vendor"
                      value={fields.vendor ?? ""}
                      onChange={(event) =>
                        onFieldsChange({ vendor: event.target.value || null })
                      }
                      placeholder="Name der Werkstatt"
                    />
                  </GarageFieldCell>
                  <GarageFieldCell
                    label="Belegnr."
                    htmlFor="invoice-review-invoice-number"
                  >
                    <GarageInsetInput
                      id="invoice-review-invoice-number"
                      value={fields.invoiceNumber ?? ""}
                      onChange={(event) =>
                        onFieldsChange({
                          invoiceNumber: event.target.value || null,
                        })
                      }
                      placeholder="optional"
                    />
                  </GarageFieldCell>
                </GarageFieldRow>
              </div>
            </details>

            <details className="garage-field-row-shell group">
              <GarageFieldDisclosureSummary label="Themen">
                <span className={disclosureHintClassName}>
                  {topicCount > 0 ? `${topicCount} ausgewählt` : "Keine erkannt"}
                </span>
              </GarageFieldDisclosureSummary>
              <div className="garage-disclosure-body space-y-2">
                <p className="text-[0.72rem] leading-relaxed text-[color:var(--vd-muted)]">
                  Nach dem Scan vorausgewählt — bei Bedarf ergänzen oder entfernen.
                </p>
                <EntryTopicChips
                  compact
                  value={fields.topicTags ?? []}
                  onChange={(topicTags) => onFieldsChange({ topicTags })}
                />
              </div>
            </details>
          </div>

          <div className="mt-5 border-t border-[color:var(--vd-field-border)] pt-5">
            {lineItemsEditor}
          </div>
        </section>
      )}

      {filePicker ? (
        manualEntry ? (
          <InsetGroupedCard
            header="Original"
            footer="PDF max. 10 MB · Bilder werden für die Ablage optimiert."
          >
            <div className="px-3 pb-3">
              <DocumentUpload
                disabled={filePicker.disabled}
                label={filePicker.label}
                hint="PDF oder Foto"
                onReady={filePicker.onReady}
              />
            </div>
          </InsetGroupedCard>
        ) : (
          <section className="zt-feature-panel space-y-2 p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
            <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
              Original (PDF oder Bild)
            </span>
            <DocumentUpload
              disabled={filePicker.disabled}
              label={filePicker.label}
              hint="PDF max. 10 MB · Bilder → Full HD JPEG"
              onReady={filePicker.onReady}
            />
          </section>
        )
      ) : null}

      {preview ? (
        manualEntry ? (
          <InsetGroupedCard
            header="Original"
            footer={
              onReset
                ? `${preview.pageCount} ${preview.pageCount === 1 ? "Seite" : "Seiten"} · ${preview.fileSizeLabel || formatBytes(0)}`
                : undefined
            }
          >
            <ScanDocumentPreview
              url={preview.url}
              kind={preview.kind}
              pageCount={preview.pageCount}
            />
            {onReset ? (
              <div className="border-t border-white/[0.08] px-4 py-3">
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[15px] font-medium text-[#8E8E93] underline-offset-2 active:opacity-70"
                >
                  Datei entfernen
                </button>
              </div>
            ) : null}
          </InsetGroupedCard>
        ) : (
          <details className="zt-feature-panel overflow-hidden shadow-[var(--vd-shadow-sm)]">
            <summary className="cursor-pointer px-4 py-3 text-[0.82rem] font-medium text-[color:var(--vd-text)]">
              Scan-Vorschau · {preview.pageCount}{" "}
              {preview.pageCount === 1 ? "Seite" : "Seiten"} ·{" "}
              {preview.fileSizeLabel || formatBytes(0)}
            </summary>
            <div className="border-t border-[color:var(--vd-border)]">
              <ScanDocumentPreview
                url={preview.url}
                kind={preview.kind}
                pageCount={preview.pageCount}
              />
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
        )
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
        savePrimaryButton(
          saving ? "Wird gespeichert…" : "Beleg speichern",
          onSave,
        )
      )}
    </div>
  );
}
