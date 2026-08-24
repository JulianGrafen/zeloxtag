"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  inferTestingOrganizationLabel,
  inspectionResultLabel,
  type Pruefung192InspectionResult,
} from "@/lib/validations/paragraph192Schema";
import { isPlausibleVin } from "@/lib/vehicles/vin";

export type Pruefung192ReviewFields = {
  reportNumber: string | null;
  inspectionDate: string | null;
  vin: string | null;
  licensePlate: string | null;
  manufacturer: string | null;
  vehicleType: string | null;
  ownerName: string | null;
  testingOrganization: string | null;
  inspectionResult: Pruefung192InspectionResult | null;
  officialExpert: string | null;
  mileageKm: number | null;
  field22Text: string | null;
  assessedModifications: string | null;
  vinMatchesGarage: boolean | null;
  zbTablePreserved: boolean;
};

export type Pruefung192OverviewProps = {
  previewUrl: string;
  previewKind?: "pdf" | "image";
  pageCount?: number;
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  garageVin?: string | null;
  isSaving?: boolean;
  saveError?: string | null;
  onSave: (payload: {
    review: Pruefung192ReviewFields;
    approvalFields: Extract<ApprovalFields, { kind: "pruefung192" }>;
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

function parseField22FromNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const match = /Feld\s*22:\s*\n?([\s\S]*?)(?:\n\nBegutachtete|$)/i.exec(notes);
  return match?.[1]?.trim() || null;
}

function parseAssessedFromNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const match = /Begutachtete Änderungen:\s*\n?([\s\S]*?)(?:\n\nTypgenehmigung|$)/i.exec(
    notes,
  );
  return match?.[1]?.trim() || null;
}

function parseResultFromNotes(
  notes: string | null | undefined,
): Pruefung192InspectionResult | null {
  if (!notes) return null;
  if (/Ergebnis:\s*Ohne Mängel/i.test(notes)) return "no_defects";
  if (/Ergebnis:\s*Schwere Mängel/i.test(notes)) return "major_defects";
  if (/Ergebnis:\s*Nicht bestanden/i.test(notes)) return "failed";
  if (/Ergebnis:\s*Mit Mängeln/i.test(notes)) return "minor_defects";
  return null;
}

function parseLicensePlateFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = /Kennzeichen:\s*(.+)/i.exec(notes);
  return match?.[1]?.trim() || null;
}

function parseOwnerFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = /Halter:\s*(.+)/i.exec(notes);
  return match?.[1]?.trim() || null;
}

function parseVinMatchFromNotes(notes: string | null | undefined): boolean | null {
  if (!notes) return null;
  if (/VIN stimmt mit Garage-Fahrzeug überein/i.test(notes)) return true;
  if (/VIN stimmt NICHT/i.test(notes)) return false;
  return null;
}

export function fieldsToPruefung192Review(
  fields: InvoiceTextParseResult,
  approvalFields: ApprovalFields | null,
): Pruefung192ReviewFields {
  const data =
    approvalFields?.kind === "pruefung192" ? approvalFields.data : null;

  return {
    reportNumber: fields.kbaNumber?.trim() || data?.reportNumber?.trim() || null,
    inspectionDate: fields.date?.trim() || null,
    vin: parseVinFromApprovals(fields.vehicleApprovals),
    licensePlate: parseLicensePlateFromNotes(fields.notes),
    manufacturer: fields.manufacturer?.trim() || null,
    vehicleType: fields.vendor?.trim() || null,
    ownerName: parseOwnerFromNotes(fields.notes),
    testingOrganization: fields.authority?.trim() || null,
    inspectionResult: data?.inspectionResult ?? parseResultFromNotes(fields.notes),
    officialExpert: data?.officialExpert?.trim() || null,
    mileageKm: fields.mileageKm,
    field22Text:
      parseField22FromNotes(fields.notes) || data?.field22Text?.trim() || null,
    assessedModifications:
      parseAssessedFromNotes(fields.notes) ||
      data?.assessedModifications?.trim() ||
      fields.partCategory?.trim() ||
      null,
    vinMatchesGarage: parseVinMatchFromNotes(fields.notes),
    zbTablePreserved: data?.zbTablePreserved ?? false,
  };
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function Pruefung192Overview({
  previewUrl,
  previewKind = "pdf",
  pageCount = 1,
  fields,
  approvalFields,
  garageVin,
  isSaving = false,
  saveError = null,
  onSave,
  onCancel,
}: Pruefung192OverviewProps) {
  const initial = useMemo(
    () => fieldsToPruefung192Review(fields, approvalFields),
    [fields, approvalFields],
  );
  const [review, setReview] = useState<Pruefung192ReviewFields>(initial);

  const vinMissing = !review.vin?.trim();
  const garageVinPlausible = isPlausibleVin(garageVin);

  function patch<K extends keyof Pruefung192ReviewFields>(
    key: K,
    value: Pruefung192ReviewFields[K],
  ) {
    setReview((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    const titleParts = [
      "§19(2) Prüfung",
      review.manufacturer,
      review.licensePlate,
    ].filter(Boolean);
    const title = titleParts.join(" · ").slice(0, 120);

    const approval: Extract<ApprovalFields, { kind: "pruefung192" }> = {
      kind: "pruefung192",
      data: {
        testingOrganization: inferTestingOrganizationLabel(
          review.testingOrganization,
        ),
        reportNumber: review.reportNumber?.trim() || "unbekannt",
        inspectionResult: review.inspectionResult,
        field22Text:
          review.field22Text?.trim() ||
          review.assessedModifications?.trim() ||
          "Siehe Originaldokument",
        assessedModifications: review.assessedModifications,
        officialExpert:
          review.officialExpert?.trim() || "Siehe Originaldokument",
        zbTablePreserved: review.zbTablePreserved,
      },
    };

    void onSave({ review, approvalFields: approval, title });
  }

  return (
    <div className="vd-anim-header flex flex-col gap-4">
      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)] sm:p-5">
        <header>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            § 19 Abs. 2 StVZO
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            Prüfung nach Umrüstung
          </h2>
          <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
            Untersuchungsbericht · ZB-Tabelle · Auflagen
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
              Fahrzeug-Ident-Nr. (VIN)
            </div>
            <Input
              value={review.vin ?? ""}
              onChange={(event) =>
                patch("vin", event.target.value.trim().toUpperCase() || null)
              }
              placeholder="z. B. WBAMX51020C763755"
              className="mt-2 font-mono text-[1.05rem] font-semibold tracking-wide"
            />
            {review.vinMatchesGarage === true && garageVinPlausible ? (
              <p className="mt-2 text-[0.78rem] font-medium text-emerald-800">
                VIN stimmt mit deinem Fahrzeug überein.
              </p>
            ) : null}
            {review.vinMatchesGarage === false && garageVinPlausible ? (
              <p className="mt-2 text-[0.78rem] font-medium text-amber-900">
                VIN stimmt nicht mit deinem Fahrzeug überein.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldBlock label="Bericht-Nr.">
              <Input
                value={review.reportNumber ?? ""}
                onChange={(event) =>
                  patch("reportNumber", event.target.value || null)
                }
              />
            </FieldBlock>
            <FieldBlock label="Prüftermin">
              <GermanDateInput
                value={review.inspectionDate}
                onChange={(iso) => patch("inspectionDate", iso)}
              />
            </FieldBlock>
            <FieldBlock label="Kennzeichen">
              <Input
                value={review.licensePlate ?? ""}
                onChange={(event) =>
                  patch("licensePlate", event.target.value || null)
                }
              />
            </FieldBlock>
            <FieldBlock label="Ergebnis">
              <select
                value={review.inspectionResult ?? ""}
                onChange={(event) =>
                  patch(
                    "inspectionResult",
                    (event.target.value as Pruefung192InspectionResult) || null,
                  )
                }
                className="flex h-10 w-full rounded-md border border-[color:var(--vd-border)] bg-transparent px-3 text-[0.88rem]"
              >
                <option value="">—</option>
                <option value="no_defects">Ohne Mängel</option>
                <option value="minor_defects">Mit Mängeln</option>
                <option value="major_defects">Schwere Mängel</option>
                <option value="failed">Nicht bestanden</option>
              </select>
              {review.inspectionResult ? (
                <p className="mt-1 text-[0.75rem] text-[color:var(--vd-muted)]">
                  {inspectionResultLabel(review.inspectionResult)}
                </p>
              ) : null}
            </FieldBlock>
            <FieldBlock label="Hersteller">
              <Input
                value={review.manufacturer ?? ""}
                onChange={(event) =>
                  patch("manufacturer", event.target.value || null)
                }
              />
            </FieldBlock>
            <FieldBlock label="Fahrzeugtyp">
              <Input
                value={review.vehicleType ?? ""}
                onChange={(event) =>
                  patch("vehicleType", event.target.value || null)
                }
              />
            </FieldBlock>
            <FieldBlock label="Prüforganisation">
              <Input
                value={review.testingOrganization ?? ""}
                onChange={(event) =>
                  patch("testingOrganization", event.target.value || null)
                }
              />
            </FieldBlock>
            <FieldBlock label="Prüfer / Sachverständiger">
              <Input
                value={review.officialExpert ?? ""}
                onChange={(event) =>
                  patch("officialExpert", event.target.value || null)
                }
              />
            </FieldBlock>
            <FieldBlock label="KM-Stand">
              <MileageKmInput
                value={review.mileageKm}
                onChange={(km) => patch("mileageKm", km)}
              />
            </FieldBlock>
          </div>

          {review.zbTablePreserved ? (
            <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-[0.78rem] text-emerald-900">
              ZB-Tabelle (Felder B, J, E, 2.1 …) als Ausschnitt im PDF gespeichert.
            </p>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-900">
              ZB-Tabelle fehlt — im Review nachtragen oder erneut scannen.
            </p>
          )}

          <FieldBlock label="Feld 22 · Bemerkungen / Änderungen">
            <textarea
              value={review.field22Text ?? ""}
              onChange={(event) =>
                patch("field22Text", event.target.value || null)
              }
              rows={5}
              className="w-full rounded-md border border-[color:var(--vd-border)] bg-transparent px-3 py-2 text-[0.85rem]"
              placeholder="Verbatim aus Gutachten zur Erlangung der BE"
            />
          </FieldBlock>

          <FieldBlock label="Begutachtete Änderungen">
            <textarea
              value={review.assessedModifications ?? ""}
              onChange={(event) =>
                patch("assessedModifications", event.target.value || null)
              }
              rows={2}
              className="w-full rounded-md border border-[color:var(--vd-border)] bg-transparent px-3 py-2 text-[0.85rem]"
            />
          </FieldBlock>
        </div>

        {saveError ? (
          <p className="mt-4 text-[0.82rem] text-red-700">{saveError}</p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            className="claim-cta w-full"
            disabled={isSaving || vinMissing}
            onClick={handleSave}
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : null}
            Prüfung speichern
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
              Verwerfen
            </Button>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
        <div className="flex items-center gap-2 border-b border-[color:var(--vd-border)] px-3 py-2.5 text-[0.78rem] text-[color:var(--vd-muted)]">
          <FileText className="h-4 w-4" />
          Dokumentvorschau · {pageCount} {pageCount === 1 ? "Seite" : "Seiten"}
        </div>
        <div className="max-h-[min(62vh,560px)] min-h-[240px] overflow-auto bg-neutral-100">
          {previewKind === "pdf" ? (
            <iframe
              title="§19(2) Prüfung Vorschau"
              src={previewUrl}
              className="h-[min(62vh,560px)] w-full border-0 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="§19(2) Prüfung Vorschau"
              className="mx-auto block w-full object-contain"
            />
          )}
        </div>
      </section>
    </div>
  );
}
