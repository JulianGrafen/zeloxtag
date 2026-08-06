"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

export type EinzelabnahmeReviewFields = {
  documentNumber: string | null;
  issueDate: string | null;
  vin: string | null;
  manufacturer: string | null;
  model: string | null;
  modificationsField22: string | null;
  additionalRemarks: string | null;
  vinMatchesGarage: boolean | null;
};

export type EinzelabnahmeOverviewProps = {
  previewUrl: string;
  previewKind?: "pdf" | "image";
  pageCount?: number;
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  garageVin?: string | null;
  isSaving?: boolean;
  saveError?: string | null;
  onSave: (payload: {
    review: EinzelabnahmeReviewFields;
    approvalFields: Extract<ApprovalFields, { kind: "einzelabnahme" }>;
    title: string;
  }) => void | Promise<void>;
  onCancel?: () => void;
};

function parseVinFromApprovals(
  approvals: string[] | null | undefined,
): string | null {
  const first = approvals?.[0]?.trim();
  if (!first) return null;
  const prefixed = /^VIN\s+(.+)/i.exec(first);
  return (prefixed?.[1] ?? first).trim() || null;
}

function parseField22FromNotes(notes: string | null | undefined): {
  field22: string | null;
  additionalRemarks: string | null;
} {
  if (!notes?.trim()) {
    return { field22: null, additionalRemarks: null };
  }

  const field22Match = /Feld\s*22:\s*\n?([\s\S]*?)(?:\n\nZusätzliche Bemerkungen:|$)/i.exec(
    notes,
  );
  const remarksMatch =
    /Zusätzliche Bemerkungen:\s*\n?([\s\S]*?)(?:\n\nWARNUNG:|$)/i.exec(notes);

  return {
    field22: field22Match?.[1]?.trim() || null,
    additionalRemarks: remarksMatch?.[1]?.trim() || null,
  };
}

function parseVinMatchFromNotes(notes: string | null | undefined): boolean | null {
  if (!notes) return null;
  if (/VIN \(Feld E\) stimmt mit Garage-Fahrzeug überein/i.test(notes)) {
    return true;
  }
  if (/VIN \(Feld E\) stimmt NICHT/i.test(notes)) {
    return false;
  }
  return null;
}

function parseModelFromSummary(summary: string | null | undefined): string | null {
  if (!summary?.trim()) return null;
  const stripped = summary.replace(/^Einzelabnahme\s*·\s*/i, "").trim();
  return stripped.length > 0 ? stripped : null;
}

export function fieldsToEinzelabnahmeReview(
  fields: InvoiceTextParseResult,
  approvalFields: ApprovalFields | null,
): EinzelabnahmeReviewFields {
  const fromNotes = parseField22FromNotes(fields.notes);
  const einzelData =
    approvalFields?.kind === "einzelabnahme" ? approvalFields.data : null;

  return {
    documentNumber:
      fields.kbaNumber?.trim() ||
      einzelData?.reportNumber?.trim() ||
      null,
    issueDate: fields.date?.trim() || null,
    vin: parseVinFromApprovals(fields.vehicleApprovals),
    manufacturer: fields.manufacturer?.trim() || null,
    model: parseModelFromSummary(fields.summary),
    modificationsField22:
      fromNotes.field22 || einzelData?.field22Text?.trim() || null,
    additionalRemarks: fromNotes.additionalRemarks,
    vinMatchesGarage: parseVinMatchFromNotes(fields.notes),
  };
}

/**
 * §21 Einzelbetriebserlaubnis review — vehicle-bound fields (E, 2, D.3, 22).
 */
export function EinzelabnahmeOverview({
  previewUrl,
  previewKind = "image",
  pageCount = 1,
  fields,
  approvalFields,
  garageVin,
  isSaving = false,
  saveError = null,
  onSave,
  onCancel,
}: EinzelabnahmeOverviewProps) {
  const initial = useMemo(
    () => fieldsToEinzelabnahmeReview(fields, approvalFields),
    [fields, approvalFields],
  );
  const [review, setReview] = useState<EinzelabnahmeReviewFields>(initial);

  const vinMissing = !review.vin?.trim();
  const field22Missing = !review.modificationsField22?.trim();

  function patch<K extends keyof EinzelabnahmeReviewFields>(
    key: K,
    value: EinzelabnahmeReviewFields[K],
  ) {
    setReview((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    const titleParts = [
      "Einzelabnahme",
      review.manufacturer,
      review.model,
    ].filter(Boolean);
    const title = titleParts.join(" · ").slice(0, 120);

    const existingExpert =
      approvalFields?.kind === "einzelabnahme"
        ? approvalFields.data.officialExpert
        : null;

    const approval: Extract<ApprovalFields, { kind: "einzelabnahme" }> = {
      kind: "einzelabnahme",
      data: {
        officialExpert: existingExpert?.trim() || "Siehe Originaldokument",
        reportNumber: review.documentNumber?.trim() || "unbekannt",
        field22Text:
          review.modificationsField22?.trim() ||
          review.additionalRemarks?.trim() ||
          "Feld 22 siehe Originaldokument",
      },
    };

    void onSave({ review, approvalFields: approval, title });
  }

  return (
    <div className="vd-anim-header flex flex-col gap-4">
      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)] sm:p-5">
        <header>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            § 21 StVZO
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            Einzelbetriebserlaubnis
          </h2>
          <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
            Fahrzeuggebunden · Felder E, 2, D.3 und 22 für die Kontrolle
          </p>
        </header>

        <div className="mt-4 space-y-4">
          <div
            className={[
              "rounded-2xl border px-4 py-3",
              vinMissing
                ? "border-amber-300/80 bg-amber-50"
                : review.vinMatchesGarage === false
                  ? "border-amber-300/80 bg-amber-50"
                  : "border-emerald-500/25 bg-emerald-500/8",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Feld E · Fahrgestellnummer (VIN)
            </div>
            <Label className="mt-2 block">
              <Input
                value={review.vin ?? ""}
                onChange={(event) =>
                  patch("vin", event.target.value.trim().toUpperCase() || null)
                }
                placeholder="z. B. 2TM000104"
                className="font-mono text-[1.05rem] font-semibold tracking-wide"
                autoComplete="off"
              />
            </Label>
            {garageVin ? (
              <p className="mt-2 text-[0.78rem] text-[color:var(--vd-muted)]">
                Garage-VIN:{" "}
                <span className="font-mono font-medium text-[color:var(--vd-text)]">
                  {garageVin}
                </span>
              </p>
            ) : null}
            {review.vinMatchesGarage === true ? (
              <p className="mt-2 text-[0.78rem] font-medium text-emerald-800">
                VIN stimmt mit deinem Fahrzeug überein.
              </p>
            ) : null}
            {review.vinMatchesGarage === false ? (
              <p className="mt-2 text-[0.78rem] font-medium text-amber-900">
                VIN stimmt nicht mit deinem Fahrzeug überein — Dokument gilt
                ggf. nicht für dieses Auto.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3">
            <FieldBlock label="Dokumentnummer">
              <Input
                value={review.documentNumber ?? ""}
                onChange={(event) =>
                  patch("documentNumber", event.target.value || null)
                }
                placeholder="z. B. 0DE0CAL09MV009494"
              />
            </FieldBlock>
            <FieldBlock label="Ausstellungsdatum">
              <Input
                value={review.issueDate ?? ""}
                onChange={(event) =>
                  patch("issueDate", event.target.value || null)
                }
                placeholder="z. B. 12.04.2019"
              />
            </FieldBlock>
            <FieldBlock label="Feld 2 · Hersteller">
              <Input
                value={review.manufacturer ?? ""}
                onChange={(event) =>
                  patch("manufacturer", event.target.value || null)
                }
                placeholder="z. B. YAMAHA (J)"
              />
            </FieldBlock>
            <FieldBlock label="Feld D.3 · Modell">
              <Input
                value={review.model ?? ""}
                onChange={(event) => patch("model", event.target.value || null)}
                placeholder="z. B. SRX 600"
              />
            </FieldBlock>
            <FieldBlock label="Feld 22 · Bemerkungen / Änderungen">
              <textarea
                value={review.modificationsField22 ?? ""}
                onChange={(event) =>
                  patch("modificationsField22", event.target.value || null)
                }
                rows={5}
                placeholder="Wörtlich aus Feld 22 übernehmen…"
                className="claim-input min-h-[7rem] resize-y font-mono text-[0.82rem] leading-relaxed"
              />
              {field22Missing ? (
                <p className="mt-1 text-[0.75rem] text-amber-800">
                  Feld 22 ist für die Kontrolle besonders wichtig.
                </p>
              ) : null}
            </FieldBlock>
            <FieldBlock label="Zusätzliche Bemerkungen">
              <textarea
                value={review.additionalRemarks ?? ""}
                onChange={(event) =>
                  patch("additionalRemarks", event.target.value || null)
                }
                rows={3}
                placeholder="Optional · Zusatztext zur Fahrzeugbeschreibung"
                className="claim-input min-h-[5rem] resize-y text-[0.85rem] leading-relaxed"
              />
            </FieldBlock>
          </div>
        </div>

        {saveError ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.78rem] text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{saveError}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Speichern…
              </span>
            ) : (
              "Einzelabnahme speichern"
            )}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={onCancel}
            >
              Abbrechen
            </Button>
          ) : null}
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
              title="Einzelabnahme Vorschau"
              src={previewUrl}
              className="h-[min(62vh,560px)] w-full border-0 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Einzelabnahme Dokumentvorschau"
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
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Label>
      <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </Label>
  );
}
