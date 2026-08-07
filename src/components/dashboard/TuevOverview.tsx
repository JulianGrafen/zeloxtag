"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  LoaderCircle,
} from "lucide-react";

import { TuevDefectsTable } from "@/components/documents/tuev-defects-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { InvoiceLineItem, InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  TESTING_ORGANIZATIONS,
  TUEV_RESULTS,
  type TestingOrganization,
  type TuevDefectRow,
  type TuevResult,
} from "@/lib/validations/documentSchemas";
import { TuevReportService } from "@/services/documents";

export type TuevReviewFields = {
  testDate: string | null;
  nextInspectionDate: string | null;
  result: TuevResult;
  mileageKm: number | null;
  documentNumber: string | null;
  testingOrganization: TestingOrganization;
  /** Free-text workshop / branch name → `documents.vendor`. */
  workshopName: string | null;
  /** Prüfgebühr / Gesamtbetrag → `documents.amount`. */
  amount: number | null;
  /** Fee line items (HU, AU, …) → `documents.line_items`. */
  lineItems: InvoiceLineItem[] | null;
};

export type TuevOverviewProps = {
  previewUrl: string;
  previewKind?: "pdf" | "image";
  pageCount?: number;
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  isSaving?: boolean;
  saveError?: string | null;
  onSave: (payload: {
    review: TuevReviewFields;
    approvalFields: Extract<ApprovalFields, { kind: "tuev" }>;
    title: string;
  }) => void | Promise<void>;
  onCancel?: () => void;
};

const TUEV_RESULT_LABELS: Record<TuevResult, string> = {
  no_defects: "Ohne Mängel",
  minor_defects: "Geringe Mängel",
  major_defects: "Erhebliche Mängel",
  dangerous_defects: "Gefährliche Mängel",
  failed: "Nicht bestanden",
};

function normalizeOrganization(value: string | null | undefined): TestingOrganization {
  const trimmed = value?.trim();
  if (
    trimmed &&
    (TESTING_ORGANIZATIONS as readonly string[]).includes(trimmed)
  ) {
    return trimmed as TestingOrganization;
  }
  return "other";
}

function normalizeIsoDateInput(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const de = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!de) return null;
  const day = Number.parseInt(de[1]!, 10);
  const month = Number.parseInt(de[2]!, 10);
  const year = Number.parseInt(de[3]!, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeYearMonthInput(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  const de = trimmed.match(/^(\d{1,2})[./-](\d{4})$/);
  if (!de) return null;
  const month = Number.parseInt(de[1]!, 10);
  const year = Number.parseInt(de[2]!, 10);
  if (month < 1 || month > 12) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function fieldsToTuevReview(
  fields: InvoiceTextParseResult,
  approvalFields: ApprovalFields | null,
): TuevReviewFields {
  const tuevData =
    approvalFields?.kind === "tuev" ? approvalFields.data : null;

  return {
    testDate:
      normalizeIsoDateInput(tuevData?.testDate) ??
      normalizeIsoDateInput(fields.date),
    nextInspectionDate: normalizeYearMonthInput(tuevData?.nextInspectionDate),
    result: tuevData?.result ?? "no_defects",
    mileageKm: tuevData?.mileageKm ?? fields.mileageKm ?? null,
    documentNumber:
      tuevData?.documentNumber?.trim() ||
      fields.invoiceNumber?.trim() ||
      null,
    testingOrganization: normalizeOrganization(
      tuevData?.testingOrganization ??
        fields.authority ??
        fields.vendor,
    ),
    workshopName:
      fields.vendor?.trim() ||
      (tuevData?.testingOrganization &&
      tuevData.testingOrganization !== "other"
        ? tuevData.testingOrganization
        : null),
    amount: fields.amount ?? null,
    lineItems: fields.lineItems ?? null,
  };
}

function reviewToApprovalPayload(
  review: TuevReviewFields,
  approvalFields: ApprovalFields | null,
): Extract<ApprovalFields, { kind: "tuev" }> {
  const existing =
    approvalFields?.kind === "tuev" ? approvalFields.data : null;

  const service = new TuevReportService();
  const data = service.parseAndValidate({
    testingOrganization: review.testingOrganization,
    testDate: review.testDate,
    result: review.result,
    mileageKm: review.mileageKm,
    nextInspectionDate: review.nextInspectionDate,
    documentNumber: review.documentNumber,
    defectsTable: existing?.defectsTable ?? null,
    defectsList: existing?.defectsList ?? null,
  });

  return { kind: "tuev", data };
}

/** Prefer structured defectsTable; fall back to plain defectsList from LLM. */
export function tuevDefectsForDisplay(
  approvalFields: ApprovalFields | null,
): TuevDefectRow[] | null {
  if (approvalFields?.kind !== "tuev") return null;
  const { defectsTable, defectsList } = approvalFields.data;
  if (defectsTable?.length) return defectsTable;
  if (!defectsList?.length) return null;
  return defectsList.map((description) => ({
    checkpoint: null,
    description,
    severity: null,
  }));
}

/**
 * HU/AU Prüfbericht review — Prüfdatum, nächste HU, Ergebnis, Mängel.
 */
export function TuevOverview({
  previewUrl,
  previewKind = "image",
  pageCount = 1,
  fields,
  approvalFields,
  isSaving = false,
  saveError = null,
  onSave,
  onCancel,
}: TuevOverviewProps) {
  const initial = useMemo(
    () => fieldsToTuevReview(fields, approvalFields),
    [fields, approvalFields],
  );
  const [review, setReview] = useState<TuevReviewFields>(initial);

  const displayDefects = useMemo(
    () => tuevDefectsForDisplay(approvalFields),
    [approvalFields],
  );
  const nextHuMissing = !review.nextInspectionDate?.trim();

  function patch<K extends keyof TuevReviewFields>(
    key: K,
    value: TuevReviewFields[K],
  ) {
    setReview((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    const workshop =
      review.workshopName?.trim() ||
      (review.testingOrganization === "other"
        ? "Prüforganisation"
        : review.testingOrganization);
    const title = [`TÜV / HU`, workshop].filter(Boolean).join(" · ").slice(0, 120);
    const approval = reviewToApprovalPayload(review, approvalFields);
    void onSave({ review, approvalFields: approval, title });
  }

  return (
    <div className="vd-anim-header flex flex-col gap-4">
      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)] sm:p-5">
        <header>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            HU / AU
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            TÜV-Prüfbericht
          </h2>
          <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
            Prüfdatum, nächste HU und Ergebnis vor dem Speichern prüfen
          </p>
        </header>

        <div
          className={[
            "mt-4 rounded-2xl border px-4 py-3",
            nextHuMissing
              ? "border-amber-300/80 bg-amber-50"
              : "border-emerald-500/25 bg-emerald-500/8",
          ].join(" ")}
        >
          <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Nächste HU
          </div>
          <Label className="mt-2 block">
            <Input
              type="month"
              value={review.nextInspectionDate ?? ""}
              onChange={(event) =>
                patch("nextInspectionDate", event.target.value || null)
              }
              className="text-[1.05rem] font-semibold"
            />
          </Label>
          {nextHuMissing ? (
            <p className="mt-2 text-[0.78rem] text-amber-900">
              Nächste HU nicht erkannt — bitte manuell setzen.
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FieldBlock label="Prüfdatum">
            <Input
              type="date"
              value={review.testDate ?? ""}
              onChange={(event) =>
                patch("testDate", event.target.value || null)
              }
            />
          </FieldBlock>
          <FieldBlock label="Ergebnis">
            <select
              value={review.result}
              onChange={(event) =>
                patch("result", event.target.value as TuevResult)
              }
              className="claim-input w-full"
            >
              {TUEV_RESULTS.map((option) => (
                <option key={option} value={option}>
                  {TUEV_RESULT_LABELS[option]}
                </option>
              ))}
            </select>
          </FieldBlock>
          <FieldBlock label="Kilometerstand">
            <Input
              inputMode="numeric"
              value={
                review.mileageKm === null ? "" : String(review.mileageKm)
              }
              onChange={(event) => {
                const raw = event.target.value.replace(/[^\d]/g, "");
                if (!raw) {
                  patch("mileageKm", null);
                  return;
                }
                const value = Number.parseInt(raw, 10);
                patch(
                  "mileageKm",
                  Number.isFinite(value) ? value : review.mileageKm,
                );
              }}
              placeholder="z. B. 87200"
            />
          </FieldBlock>
          <FieldBlock label="Vorgangsnummer">
            <Input
              value={review.documentNumber ?? ""}
              onChange={(event) =>
                patch("documentNumber", event.target.value || null)
              }
              placeholder="z. B. HU-2024-12345"
            />
          </FieldBlock>
          <FieldBlock label="Prüforganisation">
            <select
              value={review.testingOrganization}
              onChange={(event) =>
                patch(
                  "testingOrganization",
                  event.target.value as TestingOrganization,
                )
              }
              className="claim-input w-full"
            >
              {TESTING_ORGANIZATIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "other" ? "Sonstige" : option}
                </option>
              ))}
            </select>
          </FieldBlock>
          <FieldBlock label="Werkstatt / Prüfstelle" className="sm:col-span-2">
            <Input
              value={review.workshopName ?? ""}
              onChange={(event) =>
                patch("workshopName", event.target.value || null)
              }
              placeholder="z. B. TÜV Süd · GTÜ Ingenieurbüro Härtwig"
              maxLength={160}
            />
          </FieldBlock>
          <FieldBlock label="Kosten (€)">
            <Input
              inputMode="decimal"
              value={review.amount === null ? "" : String(review.amount)}
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (!raw) {
                  patch("amount", null);
                  return;
                }
                const normalized = raw.replace(",", ".");
                const value = Number.parseFloat(normalized);
                patch(
                  "amount",
                  Number.isFinite(value) ? value : review.amount,
                );
              }}
              placeholder="z. B. 118,50"
            />
          </FieldBlock>
        </div>

        {displayDefects?.length ? (
          <div className="mt-4">
            <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Festgestellte Mängel
            </p>
            <TuevDefectsTable defects={displayDefects} />
          </div>
        ) : null}

        {saveError ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.78rem] text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{saveError}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          ) : null}
          <Button
            type="button"
            className="claim-cta"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Speichern…
              </>
            ) : (
              "TÜV-Bericht speichern"
            )}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--vd-border)] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-[0.78rem] text-[color:var(--vd-muted)]">
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">
              Dokumentvorschau · {pageCount}{" "}
              {pageCount === 1 ? "Seite" : "Seiten"}
            </span>
          </div>
        </div>
        <div className="max-h-[min(62vh,560px)] min-h-[240px] overflow-auto bg-neutral-100">
          {previewKind === "pdf" ? (
            <iframe
              title="TÜV Vorschau"
              src={previewUrl}
              className="h-[min(62vh,560px)] w-full border-0 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="TÜV Dokumentvorschau"
              className="mx-auto block w-full object-contain"
            />
          )}
        </div>
      </section>
    </div>
  );
}

function FieldBlock({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Label className={className}>
      <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </Label>
  );
}
