"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  SmartReviewActions,
  SmartReviewField,
  SmartReviewPreview,
} from "@/components/documents/smart-review-shell";
import { GutachtenExtractedSummary } from "@/components/documents/gutachten-extracted-summary";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { Input } from "@/components/ui/input";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  GUTACHTEN_DOCUMENT_SUBTYPES,
  GUTACHTEN_SUBTYPE_LABELS,
  gutachtenTitle,
  gutachtenToApprovalFields,
  legacyApprovalKindToGutachtenSubtype,
  type GutachtenDocumentSubtype,
  type GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";

export type GutachtenReviewFields = GutachtenExtraction;

export type GutachtenOverviewProps = {
  previewUrl: string;
  previewKind?: "pdf" | "image";
  pageCount?: number;
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  isSaving?: boolean;
  saveError?: string | null;
  onSave: (payload: {
    review: GutachtenReviewFields;
    approvalFields: Extract<ApprovalFields, { kind: "gutachten" }>;
    title: string;
  }) => void | Promise<void>;
  onCancel?: () => void;
};

function fieldsToGutachtenReview(
  fields: InvoiceTextParseResult,
  approvalFields: ApprovalFields | null,
): GutachtenReviewFields {
  if (approvalFields?.kind === "gutachten") {
    return approvalFields.data;
  }

  if (approvalFields?.kind === "teilegutachten") {
    const tg = approvalFields.data;
    return {
      documentSubtype: "TEILEGUTACHTEN",
      partName:
        fields.partCategory?.trim() ||
        fields.summary?.replace(/^[^·]+·\s*/, "").trim() ||
        "Teilegutachten",
      modificationType: fields.partCategory?.trim() || undefined,
      manufacturer: fields.manufacturer?.trim() || undefined,
      kbaNumber: fields.kbaNumber?.trim() || undefined,
      certificateNumber:
        fields.invoiceNumber?.trim() ||
        tg.documentNumber?.trim() ||
        undefined,
      testOrganization:
        fields.authority?.trim() || fields.vendor?.trim() || undefined,
      issueDate: fields.date?.trim() || undefined,
      markingType: tg.markingType?.trim() || undefined,
      markingNumber: tg.markingNumber?.trim() || undefined,
      ownerNotes: tg.ownerNotes?.trim() || undefined,
      conditions: fields.conditions?.length ? fields.conditions : undefined,
      matchedVehicleRow: fields.vehicleApprovals?.[0]?.trim() || undefined,
      vehicleMatchNotes:
        tg.validityArea?.trim() ||
        fields.vehicleApprovals?.[0]?.trim() ||
        fields.notes?.trim() ||
        undefined,
    };
  }

  if (approvalFields?.kind === "einzelabnahme") {
    const ea = approvalFields.data;
    return {
      documentSubtype: "EINZELABNAHME",
      partName:
        fields.partCategory?.trim() ||
        fields.summary?.replace(/^[^·]+·\s*/, "").trim() ||
        "Einzelabnahme",
      certificateNumber:
        fields.kbaNumber?.trim() ||
        fields.invoiceNumber?.trim() ||
        ea.reportNumber?.trim() ||
        undefined,
      testOrganization: fields.authority?.trim() || undefined,
      issueDate: fields.date?.trim() || undefined,
      modificationsField22: ea.field22Text?.trim() || fields.notes?.trim(),
      vehicleMatchNotes: fields.vehicleApprovals?.[0]?.trim() || undefined,
    };
  }

  if (approvalFields?.kind === "pruefung192") {
    const p192 = approvalFields.data;
    return {
      documentSubtype: "ANBAUBESTAETIGUNG",
      partName:
        p192.assessedModifications?.trim() ||
        fields.partCategory?.trim() ||
        fields.summary?.replace(/^[^·]+·\s*/, "").trim() ||
        "Anbauabnahme",
      certificateNumber:
        fields.kbaNumber?.trim() ||
        fields.invoiceNumber?.trim() ||
        p192.reportNumber?.trim() ||
        undefined,
      testOrganization: fields.authority?.trim() || undefined,
      issueDate: fields.date?.trim() || undefined,
      modificationsField22: p192.field22Text?.trim() || undefined,
      vehicleMatchNotes: fields.vehicleApprovals?.[0]?.trim() || undefined,
    };
  }

  const legacySubtype =
    approvalFields?.kind != null
      ? legacyApprovalKindToGutachtenSubtype(approvalFields.kind)
      : null;

  return {
    documentSubtype: legacySubtype ?? "SONSTIGES",
    partName:
      fields.partCategory?.trim() ||
      fields.summary?.replace(/^[^·]+·\s*/, "").trim() ||
      "Gutachten",
    modificationType: fields.partCategory?.trim() || undefined,
    manufacturer: fields.manufacturer?.trim() || undefined,
    kbaNumber: fields.kbaNumber?.trim() || undefined,
    certificateNumber:
      fields.invoiceNumber?.trim() ||
      undefined,
    testOrganization:
      fields.authority?.trim() || fields.vendor?.trim() || undefined,
    issueDate: fields.date?.trim() || undefined,
    markingType: undefined,
    markingNumber: undefined,
    conditions: fields.conditions?.length ? fields.conditions : undefined,
    ownerNotes: undefined,
    matchedVehicleRow: fields.vehicleApprovals?.[0]?.trim() || undefined,
    vehicleMatchNotes:
      fields.vehicleApprovals?.[0]?.trim() ||
      fields.notes?.trim() ||
      undefined,
    vin: undefined,
    modificationsField22: undefined,
  };
}

export function GutachtenOverview({
  previewUrl,
  previewKind = "image",
  pageCount = 1,
  fields,
  approvalFields,
  isSaving = false,
  saveError = null,
  onSave,
  onCancel,
}: GutachtenOverviewProps) {
  const initial = useMemo(
    () => fieldsToGutachtenReview(fields, approvalFields),
    [fields, approvalFields],
  );
  const [review, setReview] = useState<GutachtenReviewFields>(initial);
  const [subtypeOpen, setSubtypeOpen] = useState(false);

  const title = gutachtenTitle(review);
  const canSave = review.partName.trim().length > 0;

  function update<K extends keyof GutachtenReviewFields>(
    key: K,
    value: GutachtenReviewFields[K],
  ) {
    setReview((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const payload = {
      ...review,
      partName: review.partName.trim(),
      modificationType: review.modificationType?.trim() || undefined,
      manufacturer: review.manufacturer?.trim() || undefined,
      kbaNumber: review.kbaNumber?.trim() || undefined,
      certificateNumber: review.certificateNumber?.trim() || undefined,
      testOrganization: review.testOrganization?.trim() || undefined,
      issueDate: review.issueDate?.trim() || undefined,
      markingType: review.markingType?.trim() || undefined,
      markingNumber: review.markingNumber?.trim() || undefined,
      ownerNotes: review.ownerNotes?.trim() || undefined,
      matchedVehicleRow: review.matchedVehicleRow?.trim() || undefined,
      vehicleMatchNotes: review.vehicleMatchNotes?.trim() || undefined,
      vin: review.vin?.trim() || undefined,
      modificationsField22: review.modificationsField22?.trim() || undefined,
      conditions: review.conditions?.length ? review.conditions : undefined,
    };
    await onSave({
      review: payload,
      approvalFields: gutachtenToApprovalFields(payload),
      title: gutachtenTitle(payload),
    });
  }

  return (
    <div className="space-y-5">
      <SmartReviewPreview
        previewUrl={previewUrl}
        previewKind={previewKind}
        pageCount={pageCount}
        alt="Gutachten Vorschau"
      />

      <GutachtenExtractedSummary extraction={review} />

      <div className="relative">
        <button
          type="button"
          onClick={() => setSubtypeOpen((open) => !open)}
          className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-[0.82rem] font-medium text-emerald-950"
        >
          <span>
            ✓ Erkannt: {GUTACHTEN_SUBTYPE_LABELS[review.documentSubtype]}
          </span>
          <ChevronDown
            className={[
              "h-4 w-4 shrink-0 transition-transform",
              subtypeOpen ? "rotate-180" : "",
            ].join(" ")}
            aria-hidden
          />
        </button>
        {subtypeOpen ? (
          <ul className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-white shadow-lg">
            {GUTACHTEN_DOCUMENT_SUBTYPES.map((subtype) => (
              <li key={subtype}>
                <button
                  type="button"
                  className={[
                    "w-full px-3 py-2.5 text-left text-[0.82rem] hover:bg-neutral-50",
                    subtype === review.documentSubtype
                      ? "font-semibold text-neutral-900"
                      : "text-neutral-700",
                  ].join(" ")}
                  onClick={() => {
                    update("documentSubtype", subtype);
                    setSubtypeOpen(false);
                  }}
                >
                  {GUTACHTEN_SUBTYPE_LABELS[subtype]}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-4 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white p-4 shadow-[var(--vd-shadow-sm)]">
        <SmartReviewField label="Bauteil / Umrüstung">
          <Input
            value={review.partName}
            onChange={(event) => update("partName", event.target.value)}
          />
        </SmartReviewField>

        {review.modificationType ? (
          <SmartReviewField
            label="Art der Umrüstung"
            hint="Volltext von der Titelseite — bei Bedarf kürzen."
          >
            <textarea
              value={review.modificationType}
              onChange={(event) =>
                update("modificationType", event.target.value || undefined)
              }
              rows={3}
              className="flex min-h-[5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </SmartReviewField>
        ) : null}

        <SmartReviewField label="Hersteller">
          <Input
            value={review.manufacturer ?? ""}
            onChange={(event) =>
              update("manufacturer", event.target.value || undefined)
            }
            placeholder="Optional"
          />
        </SmartReviewField>

        <SmartReviewField label="KBA-Nummer">
          <Input
            value={review.kbaNumber ?? review.certificateNumber ?? ""}
            onChange={(event) =>
              update("kbaNumber", event.target.value || undefined)
            }
            placeholder="z. B. 91180"
          />
        </SmartReviewField>

        <SmartReviewField label="Gutachten- / TG-Nr.">
          <Input
            value={review.certificateNumber ?? ""}
            onChange={(event) =>
              update("certificateNumber", event.target.value || undefined)
            }
            placeholder="z. B. 14-TG-0892-00"
          />
        </SmartReviewField>

        <SmartReviewField label="Prüforganisation">
          <Input
            value={review.testOrganization ?? ""}
            onChange={(event) =>
              update("testOrganization", event.target.value || undefined)
            }
            placeholder="TÜV, DEKRA, GTÜ …"
          />
        </SmartReviewField>

        <SmartReviewField label="Ausstellungsdatum">
          <GermanDateInput
            value={review.issueDate ?? ""}
            onChange={(value) => update("issueDate", value || undefined)}
          />
        </SmartReviewField>

        {review.markingType || review.markingNumber ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SmartReviewField label="Kennzeichnung · Art">
              <Input
                value={review.markingType ?? ""}
                onChange={(event) =>
                  update("markingType", event.target.value || undefined)
                }
              />
            </SmartReviewField>
            <SmartReviewField label="Kennzeichnung · Nummer">
              <Input
                value={review.markingNumber ?? ""}
                onChange={(event) =>
                  update("markingNumber", event.target.value || undefined)
                }
              />
            </SmartReviewField>
          </div>
        ) : null}

        {review.conditions?.length ? (
          <SmartReviewField
            label={`Auflagen (${review.conditions.length})`}
            hint="Aus Punkt IV — Details im PDF."
          >
            <ul className="space-y-2 text-[0.82rem] leading-relaxed text-neutral-700">
              {review.conditions.map((entry, index) => (
                <li
                  key={`${index}-${entry.slice(0, 24)}`}
                  className="rounded-lg bg-neutral-50 px-3 py-2"
                >
                  {entry}
                </li>
              ))}
            </ul>
          </SmartReviewField>
        ) : null}

        <SmartReviewField
          label="Verwendung / Fahrzeug-Hinweise"
          hint="Kurz zusammengefasst — Details bleiben im PDF."
        >
          <textarea
            value={review.vehicleMatchNotes ?? ""}
            onChange={(event) =>
              update("vehicleMatchNotes", event.target.value || undefined)
            }
            rows={3}
            placeholder="Optional"
            className="flex min-h-[5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </SmartReviewField>
      </div>

      {saveError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] text-red-800">
          {saveError}
        </p>
      ) : null}

      <SmartReviewActions
        onSave={() => void handleSave()}
        onCancel={onCancel}
        isSaving={isSaving}
        saveDisabled={!canSave}
        saveLabel={title ? `${title} speichern` : "Speichern"}
      />
    </div>
  );
}

export { fieldsToGutachtenReview };
