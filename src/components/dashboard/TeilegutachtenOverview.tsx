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
import {
  teilegutachtenToApprovalFields,
  type TeilegutachtenExtraction,
} from "@/lib/validations/teilegutachtenSchema";
import type { AbeUserVehicleMatchStatus } from "@/lib/validations/abeSchema";

export type TeilegutachtenReviewFields = {
  certificateNumber: string | null;
  manufacturer: string | null;
  partCategory: string | null;
  partType: string | null;
  physicalMarking: string | null;
  testingOrganization: string | null;
  userVehicleMatchStatus: AbeUserVehicleMatchStatus | null;
  matchedVehicleRow: string | null;
  /** Fahrzeugfreigaben — one entry per compatible vehicle / row. */
  vehicleApprovals: string[] | null;
  verwendungsbereich: string | null;
  auflagen: string[] | null;
};

export type TeilegutachtenOverviewProps = {
  previewUrl: string;
  previewKind?: "pdf" | "image";
  pageCount?: number;
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  isSaving?: boolean;
  saveError?: string | null;
  onSave: (payload: {
    review: TeilegutachtenReviewFields;
    approvalFields: Extract<ApprovalFields, { kind: "teilegutachten" }>;
    title: string;
  }) => void | Promise<void>;
  onCancel?: () => void;
};

function parseMatchStatusFromNotes(
  notes: string | null | undefined,
): AbeUserVehicleMatchStatus | null {
  const match = notes?.match(
    /Fahrzeug-Check:\s*(verified|not_found|needs_manual_check)/i,
  )?.[1];
  if (
    match === "verified" ||
    match === "not_found" ||
    match === "needs_manual_check"
  ) {
    return match;
  }
  return null;
}

function parseMatchedRowFromNotes(
  notes: string | null | undefined,
): string | null {
  return notes?.match(/Trefferzeile:\s*(.+)/i)?.[1]?.trim() || null;
}

function parseVerwendungsbereichFromNotes(
  notes: string | null | undefined,
): string | null {
  const match = notes?.match(
    /Verwendungsbereich:\s*\n([\s\S]*?)(?:\n\n(?:Kennzeichnung:|Hinweis:|Fahrzeug-Check:)|$)/i,
  );
  return match?.[1]?.trim() || null;
}

function parseFromValidityArea(validityArea: string | null | undefined): {
  verwendungsbereich: string | null;
  auflagen: string[] | null;
} {
  if (!validityArea?.trim()) {
    return { verwendungsbereich: null, auflagen: null };
  }

  const auflagenMatch = validityArea.match(
    /Auflagen:\s*\n([\s\S]+?)(?:\n\nKennzeichnung:|$)/i,
  );
  const auflagen = auflagenMatch?.[1]
    ?.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let vb = validityArea
    .replace(/\n\nAuflagen:[\s\S]*/i, "")
    .replace(/\n\nKennzeichnung:[\s\S]*/i, "")
    .replace(/^Fahrzeugzeile:\s*.+\n?/im, "")
    .trim();

  if (!vb || vb === "Verwendungsbereich siehe Originaldokument") {
    vb = "";
  }

  return {
    verwendungsbereich: vb.length > 0 ? vb : null,
    auflagen: auflagen?.length ? auflagen : null,
  };
}

function formatLinesForEdit(values: string[] | null | undefined): string {
  return values?.join("\n") ?? "";
}

function parseLinesFromEdit(value: string): string[] | null {
  const lines = value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

function formatAuflagenForEdit(auflagen: string[] | null | undefined): string {
  return auflagen?.join("\n") ?? "";
}

function parseAuflagenFromEdit(value: string): string[] | null {
  const lines = value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

function parsePhysicalMarkingFromNotes(
  notes: string | null | undefined,
): string | null {
  return notes?.match(/Kennzeichnung:\s*(.+)/i)?.[1]?.trim() || null;
}

function parsePartTypeFromSummary(
  summary: string | null | undefined,
): string | null {
  if (!summary?.trim()) return null;
  const stripped = summary.replace(/^Teilegutachten\s*·\s*/i, "").trim();
  return stripped.length > 0 ? stripped : null;
}

export function fieldsToTeilegutachtenReview(
  fields: InvoiceTextParseResult,
  approvalFields: ApprovalFields | null,
): TeilegutachtenReviewFields {
  const tgData =
    approvalFields?.kind === "teilegutachten" ? approvalFields.data : null;

  const fromValidity = parseFromValidityArea(tgData?.validityArea);

  return {
    certificateNumber:
      fields.kbaNumber?.trim() ||
      fields.invoiceNumber?.trim() ||
      tgData?.documentNumber?.trim() ||
      null,
    manufacturer: fields.manufacturer?.trim() || null,
    partCategory: fields.partCategory?.trim() || null,
    partType:
      fields.vendor?.trim() ||
      parsePartTypeFromSummary(fields.summary) ||
      null,
    physicalMarking: parsePhysicalMarkingFromNotes(fields.notes),
    testingOrganization:
      fields.authority?.trim() || tgData?.testingOrganization || null,
    userVehicleMatchStatus: parseMatchStatusFromNotes(fields.notes),
    matchedVehicleRow:
      parseMatchedRowFromNotes(fields.notes) ||
      fields.vehicleApprovals?.[0]?.trim() ||
      null,
    vehicleApprovals: fields.vehicleApprovals?.length
      ? [...fields.vehicleApprovals]
      : null,
    verwendungsbereich:
      parseVerwendungsbereichFromNotes(fields.notes) ||
      fromValidity.verwendungsbereich,
    auflagen: fields.conditions?.length
      ? fields.conditions
      : fromValidity.auflagen,
  };
}

function reviewToExtraction(
  review: TeilegutachtenReviewFields,
): TeilegutachtenExtraction {
  return {
    documentType: "Teilegutachten",
    certificateNumber: review.certificateNumber?.trim() || null,
    manufacturer: review.manufacturer?.trim() || null,
    partCategory: review.partCategory?.trim() || null,
    partType: review.partType?.trim() || null,
    physicalMarking: review.physicalMarking?.trim() || null,
    requiresPhysicalInspection: true,
    testingOrganization: review.testingOrganization?.trim() || null,
    userVehicleMatchStatus: review.userVehicleMatchStatus,
    verwendungsbereich: review.verwendungsbereich?.trim() || null,
    auflagen: review.auflagen,
    matchedVehicleRow: review.matchedVehicleRow?.trim() || null,
    compatibilityTable: null,
  };
}

/**
 * § 19 Abs. 3 Teilegutachten review — Gutachtennummer, Kennzeichnung, Verwendungsbereich.
 */
export function TeilegutachtenOverview({
  previewUrl,
  previewKind = "image",
  pageCount = 1,
  fields,
  approvalFields,
  isSaving = false,
  saveError = null,
  onSave,
  onCancel,
}: TeilegutachtenOverviewProps) {
  const initial = useMemo(
    () => fieldsToTeilegutachtenReview(fields, approvalFields),
    [fields, approvalFields],
  );
  const [review, setReview] = useState<TeilegutachtenReviewFields>(initial);

  const numberMissing = !review.certificateNumber?.trim();

  function patch<K extends keyof TeilegutachtenReviewFields>(
    key: K,
    value: TeilegutachtenReviewFields[K],
  ) {
    setReview((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    const titleParts = [
      "Teilegutachten",
      review.manufacturer,
      review.partType || review.partCategory,
    ].filter(Boolean);
    const title = titleParts.join(" · ").slice(0, 120);
    const approval = teilegutachtenToApprovalFields(reviewToExtraction(review));
    void onSave({ review, approvalFields: approval, title });
  }

  return (
    <div className="vd-anim-header grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
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
              title="Teilegutachten Vorschau"
              src={previewUrl}
              className="h-[min(62vh,560px)] w-full border-0 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Teilegutachten Dokumentvorschau"
              className="mx-auto block w-full object-contain"
            />
          )}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)] sm:p-5">
        <header>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            § 19 Abs. 3 StVZO
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            Teilegutachten
          </h2>
          <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
            Gutachtennummer, Kennzeichnung und Verwendungsbereich — keine KBA-Freigabe
          </p>
        </header>

        <div
          role="status"
          className="mt-4 flex gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.78rem] text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Ein Teilegutachten allein reicht bei der Kontrolle nicht — es fehlt
            die Anbauabnahme durch einen anerkannten Sachverständigen.
          </p>
        </div>

        <div
          className={[
            "mt-4 rounded-2xl border px-4 py-3",
            numberMissing
              ? "border-amber-300/80 bg-amber-50"
              : "border-emerald-500/25 bg-emerald-500/8",
          ].join(" ")}
        >
          <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Teilegutachten-Nr.
          </div>
          <Label className="mt-2 block">
            <Input
              value={review.certificateNumber ?? ""}
              onChange={(event) =>
                patch("certificateNumber", event.target.value || null)
              }
              placeholder="z. B. 14-00123-CP-GBM"
              className="font-mono text-[1.05rem] font-semibold tracking-wide"
              autoComplete="off"
            />
          </Label>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Hersteller">
            <Input
              value={review.manufacturer ?? ""}
              onChange={(event) =>
                patch("manufacturer", event.target.value || null)
              }
              placeholder="z. B. Eibach"
            />
          </Field>
          <Field label="Prüforganisation">
            <Input
              value={review.testingOrganization ?? ""}
              onChange={(event) =>
                patch("testingOrganization", event.target.value || null)
              }
              placeholder="z. B. TÜV SÜD"
            />
          </Field>
          <Field label="Bauteil / Kategorie">
            <Input
              value={review.partCategory ?? ""}
              onChange={(event) =>
                patch("partCategory", event.target.value || null)
              }
              placeholder="z. B. Sonderfahrwerksfedern"
            />
          </Field>
          <Field label="Typ / Modell">
            <Input
              value={review.partType ?? ""}
              onChange={(event) =>
                patch("partType", event.target.value || null)
              }
              placeholder="z. B. Eibach 21-85-041-01-VA"
            />
          </Field>
          <Field label="Kennzeichnung am Bauteil">
            <Input
              value={review.physicalMarking ?? ""}
              onChange={(event) =>
                patch("physicalMarking", event.target.value || null)
              }
              placeholder='z. B. "Aufdruck auf den Federwindungen"'
            />
          </Field>
          <Field label="Fahrzeugfreigaben (eine pro Zeile)">
            <textarea
              value={formatLinesForEdit(review.vehicleApprovals)}
              onChange={(event) =>
                patch("vehicleApprovals", parseLinesFromEdit(event.target.value))
              }
              placeholder={"Mazda RX-8 (SE3P)\nBMW 3er (E90)"}
              rows={4}
              className="claim-input min-h-[5.5rem] w-full resize-y text-[0.88rem]"
            />
          </Field>
          <Field label="Verwendungsbereich">
            <textarea
              value={review.verwendungsbereich ?? ""}
              onChange={(event) =>
                patch("verwendungsbereich", event.target.value || null)
              }
              placeholder="Für welche Fahrzeuge / Konfigurationen gilt das Teilegutachten?"
              rows={4}
              className="claim-input min-h-[5.5rem] w-full resize-y text-[0.88rem]"
            />
          </Field>
          <Field label="Auflagen (eine pro Zeile)">
            <textarea
              value={formatAuflagenForEdit(review.auflagen)}
              onChange={(event) =>
                patch("auflagen", parseAuflagenFromEdit(event.target.value))
              }
              placeholder={"Sichtprüfung der Befestigungspunkte\nAchsvermessung erforderlich"}
              rows={5}
              className="claim-input min-h-[6.5rem] w-full resize-y font-mono text-[0.84rem] leading-relaxed"
            />
          </Field>
        </div>

        {review.userVehicleMatchStatus ? (
          <p className="mt-4 text-[0.78rem] text-[color:var(--vd-muted)]">
            Fahrzeug-Check:{" "}
            <span className="font-medium text-[color:var(--vd-text)]">
              {review.userVehicleMatchStatus}
            </span>
            {review.matchedVehicleRow
              ? ` · ${review.matchedVehicleRow}`
              : null}
          </p>
        ) : null}

        {saveError ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {saveError}
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
            disabled={isSaving || numberMissing}
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Speichern…
              </>
            ) : (
              "Teilegutachten speichern"
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Label className="block space-y-1.5 text-[0.78rem]">
      <span className="font-medium text-[color:var(--vd-muted)]">{label}</span>
      {children}
    </Label>
  );
}
