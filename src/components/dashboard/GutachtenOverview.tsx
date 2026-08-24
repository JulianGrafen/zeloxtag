"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  SmartReviewActions,
  SmartReviewField,
  SmartReviewPreview,
} from "@/components/documents/smart-review-shell";
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
    manufacturer: fields.manufacturer?.trim() || undefined,
    certificateNumber:
      fields.kbaNumber?.trim() ||
      fields.invoiceNumber?.trim() ||
      undefined,
    testOrganization:
      fields.authority?.trim() || fields.vendor?.trim() || undefined,
    issueDate: fields.date?.trim() || undefined,
    vehicleMatchNotes:
      fields.vehicleApprovals?.[0]?.trim() ||
      fields.notes?.trim() ||
      undefined,
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
      manufacturer: review.manufacturer?.trim() || undefined,
      certificateNumber: review.certificateNumber?.trim() || undefined,
      testOrganization: review.testOrganization?.trim() || undefined,
      issueDate: review.issueDate?.trim() || undefined,
      vehicleMatchNotes: review.vehicleMatchNotes?.trim() || undefined,
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

        <SmartReviewField label="Hersteller">
          <Input
            value={review.manufacturer ?? ""}
            onChange={(event) =>
              update("manufacturer", event.target.value || undefined)
            }
            placeholder="Optional"
          />
        </SmartReviewField>

        <SmartReviewField label="Gutachten- / Bericht-Nr.">
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
