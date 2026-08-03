"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  FileText,
  LoaderCircle,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAbeExtraction } from "@/hooks/use-abe-extraction";
import {
  ABE_PART_CATEGORIES,
  ABE_PART_CATEGORY_LABELS,
  type AbeCoreParseResult,
  type AbePartCategory,
} from "@/lib/ocr/abe-parse-schema";
import { normalizeVehicleApprovals } from "@/lib/ocr/abe-from-text";

export type AbeSavePayload = AbeCoreParseResult & {
  vehicleApprovals: string[] | null;
  conditions: string[] | null;
};

export type ABEOverviewProps = {
  /** Object URL or same-origin URL for the scanned PDF/image. */
  previewUrl: string;
  previewKind?: "pdf" | "image";
  pageCount?: number;
  /** Azure OCR text — drives specialized `/api/ocr/parse-abe`. */
  rawText?: string;
  /** Seed / fallback while extraction runs. */
  initialFields?: Partial<AbeCoreParseResult>;
  /** Approved vehicle models (make + model) from OCR. */
  initialVehicleApprovals?: string[] | null;
  /** Auflagen from OCR. */
  initialConditions?: string[] | null;
  /** Skip auto-call when parent already ran specialized parse. */
  autoExtract?: boolean;
  isSaving?: boolean;
  /** Extra error from parent save path. */
  saveError?: string | null;
  onSave: (fields: AbeSavePayload) => void | Promise<void>;
  onCancel?: () => void;
};

function parseCommaList(value: string): string[] | null {
  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

/** One Auflage per line (full wording; avoids `|` inside legal text). */
function parseConditionLines(value: string): string[] | null {
  const items = value
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

/**
 * ABE review surface: scrollable document preview + editable core metadata.
 * Fetch/parse state lives in `useAbeExtraction` — not in render helpers.
 */
export function ABEOverview({
  previewUrl,
  previewKind = "image",
  pageCount = 1,
  rawText = "",
  initialFields,
  initialVehicleApprovals = null,
  initialConditions = null,
  autoExtract = true,
  isSaving = false,
  saveError = null,
  onSave,
  onCancel,
}: ABEOverviewProps) {
  const {
    fields,
    status,
    error: extractError,
    isEditing,
    isLoading,
    isRefreshing,
    showInitialSkeleton,
    setIsEditing,
    updateField,
    updatePartCategory,
    extract,
  } = useAbeExtraction({
    rawText,
    initialFields,
    autoExtract,
  });

  const [vehicleApprovalsText, setVehicleApprovalsText] = useState(() =>
    (normalizeVehicleApprovals(initialVehicleApprovals) ?? []).join(", "),
  );
  const [conditionsText, setConditionsText] = useState(() =>
    (initialConditions ?? []).join("\n"),
  );
  const [approvalsTouched, setApprovalsTouched] = useState(false);
  const [conditionsTouched, setConditionsTouched] = useState(false);

  // Adopt OCR seeds that arrive after first paint.
  useEffect(() => {
    if (approvalsTouched) return;
    const next = (normalizeVehicleApprovals(initialVehicleApprovals) ?? []).join(
      ", ",
    );
    if (next) setVehicleApprovalsText(next);
  }, [initialVehicleApprovals, approvalsTouched]);

  useEffect(() => {
    if (conditionsTouched) return;
    const next = (initialConditions ?? []).join("\n");
    if (next) setConditionsText(next);
  }, [initialConditions, conditionsTouched]);

  const vehicleApprovals = useMemo(
    () => normalizeVehicleApprovals(parseCommaList(vehicleApprovalsText)),
    [vehicleApprovalsText],
  );
  const conditions = useMemo(
    () => parseConditionLines(conditionsText),
    [conditionsText],
  );

  const bannerError = saveError ?? extractError;
  const kbaMissing = !fields.kbaNumber?.trim();

  const categoryOptions = useMemo(
    () =>
      ABE_PART_CATEGORIES.map((value) => ({
        value,
        label: ABE_PART_CATEGORY_LABELS[value],
      })),
    [],
  );

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
              title="ABE Vorschau"
              src={previewUrl}
              className="h-[min(62vh,560px)] w-full border-0 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="ABE Dokumentvorschau"
              className="mx-auto block w-full object-contain"
            />
          )}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)] sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Metadata Summary
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
              ABE Kern­daten
            </h2>
            <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
              Ein Bauteil · bitte alle Seiten geprüft haben
            </p>
            {pageCount <= 1 ? (
              <p className="mt-2 rounded-xl bg-amber-50 px-2.5 py-2 text-[0.75rem] leading-snug text-amber-950">
                Nur 1 Seite erkannt. ABEs haben oft mehrere Seiten — prüfen, ob
                das komplette Gutachten erfasst wurde.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-1.5 text-[0.72rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {isEditing ? "Ansicht" : "Bearbeiten"}
          </button>
        </header>

        {showInitialSkeleton ? (
          <div className="mt-4 space-y-3" aria-busy="true" aria-live="polite">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-3/4 rounded-xl" />
          </div>
        ) : (
          <div className="mt-4 space-y-4" aria-busy={isRefreshing}>
            {isRefreshing ? (
              <p className="flex items-center gap-2 text-[0.75rem] text-[color:var(--vd-muted)]">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Felder werden verfeinert…
              </p>
            ) : null}
            <div
              className={[
                "rounded-2xl border px-4 py-3",
                kbaMissing
                  ? "border-amber-300/80 bg-amber-50"
                  : "border-emerald-500/25 bg-emerald-500/8",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                KBA-Nummer
              </div>
              {isEditing ? (
                <Label className="mt-2 block">
                  <Input
                    value={fields.kbaNumber ?? ""}
                    onChange={(event) =>
                      updateField("kbaNumber", event.target.value || null)
                    }
                    placeholder="z. B. KBA 91234"
                    className="font-mono text-[1.05rem] font-semibold tracking-wide"
                    autoComplete="off"
                  />
                </Label>
              ) : (
                <p className="mt-1 font-mono text-[1.45rem] font-semibold tracking-wide text-[color:var(--vd-text)]">
                  {fields.kbaNumber ?? "— nicht erkannt —"}
                </p>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <FieldLabel label="Hersteller">
                  <Input
                    value={fields.manufacturer ?? ""}
                    onChange={(event) =>
                      updateField("manufacturer", event.target.value || null)
                    }
                    placeholder="z. B. AutoExe, Milltek, OZ"
                  />
                </FieldLabel>
                <FieldLabel label="Bauteil / Typ">
                  <Input
                    value={fields.partType ?? ""}
                    onChange={(event) =>
                      updateField("partType", event.target.value || null)
                    }
                    placeholder="z. B. Carbon Frontlippe"
                  />
                </FieldLabel>
                <FieldLabel label="Kategorie">
                  <select
                    value={fields.partCategory}
                    onChange={(event) =>
                      updatePartCategory(event.target.value as AbePartCategory)
                    }
                    className="flex h-11 w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 text-[0.9rem] text-[color:var(--vd-text)] outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
                <FieldLabel label="Fahrzeugmodelle (Freigaben)">
                  <Input
                    value={vehicleApprovalsText}
                    onChange={(event) => {
                      setApprovalsTouched(true);
                      setVehicleApprovalsText(event.target.value);
                    }}
                    placeholder="z. B. Mazda RX-8, Mazda RX-8 Spirit R"
                  />
                </FieldLabel>
                <FieldLabel label="Auflagen (eine pro Zeile)">
                  <textarea
                    value={conditionsText}
                    onChange={(event) => {
                      setConditionsTouched(true);
                      setConditionsText(event.target.value);
                    }}
                    placeholder={"Auflage 1\nAuflage 2"}
                    rows={5}
                    className="flex min-h-[7.5rem] w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.88rem] leading-relaxed text-[color:var(--vd-text)] outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15"
                  />
                </FieldLabel>
              </div>
            ) : (
              <dl className="grid gap-2.5 text-[0.88rem]">
                <SummaryRow
                  label="Hersteller"
                  value={fields.manufacturer}
                />
                <SummaryRow label="Bauteil / Typ" value={fields.partType} />
                <SummaryRow
                  label="Kategorie"
                  value={ABE_PART_CATEGORY_LABELS[fields.partCategory]}
                />
                <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] px-3 py-2.5">
                  <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                    Fahrzeugmodelle
                  </dt>
                  <dd className="mt-1.5 space-y-1.5">
                    {vehicleApprovals?.length ? (
                      vehicleApprovals.map((model) => (
                        <p
                          key={model}
                          className="flex items-center gap-1.5 font-medium text-[color:var(--vd-text)]"
                        >
                          <ShieldCheck
                            className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                            aria-hidden
                          />
                          {model}
                        </p>
                      ))
                    ) : (
                      <span className="text-[color:var(--vd-muted)]">—</span>
                    )}
                  </dd>
                </div>
                <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] px-3 py-2.5">
                  <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                    Auflagen
                  </dt>
                  <dd className="mt-1.5 space-y-2">
                    {conditions?.length ? (
                      conditions.map((condition, index) => (
                        <p
                          key={`${index}-${condition.slice(0, 24)}`}
                          className="text-[0.84rem] leading-relaxed text-[color:var(--vd-text)]"
                        >
                          <span className="mr-1.5 font-semibold text-[color:var(--vd-muted)]">
                            {index + 1}.
                          </span>
                          {condition}
                        </p>
                      ))
                    ) : (
                      <span className="text-[color:var(--vd-muted)]">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}

        {bannerError ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.78rem] text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{bannerError}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            disabled={isLoading || isRefreshing || isSaving}
            onClick={() => {
              if (!isEditing) setIsEditing(false);
              void onSave({
                ...fields,
                vehicleApprovals,
                conditions,
              });
            }}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Speichern…
              </span>
            ) : (
              "ABE speichern"
            )}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                isLoading ||
                isRefreshing ||
                isSaving ||
                rawText.trim().length < 8
              }
              onClick={() => {
                setIsEditing(false);
                void extract(rawText);
              }}
            >
              Erneut lesen
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
            ) : (
              <span />
            )}
          </div>

          {status === "empty_text" ? (
            <p className="text-center text-[0.72rem] text-[color:var(--vd-muted)]">
              Ohne OCR-Text bitte manuell bearbeiten und speichern.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FieldLabel({
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
      {children}
    </Label>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] px-3 py-2.5">
      <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-[color:var(--vd-text)]">
        {value?.trim() || "—"}
      </dd>
    </div>
  );
}
