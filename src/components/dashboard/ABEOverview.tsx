"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  FileText,
  LoaderCircle,
  Pencil,
} from "lucide-react";

import { CompatibilityTable } from "@/components/dashboard/CompatibilityTable";
import {
  AbeFieldLabel,
  AbeKbaHero,
  AbeSummaryRow,
} from "@/components/documents/abe-review-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAbeExtraction } from "@/hooks/use-abe-extraction";
import {
  formatAbeVehicleContextLabel,
  type AbeMinimal,
  type AbeUserVehicleMatchStatus,
  type AbeVehicleContext,
  type TableData,
} from "@/lib/validations/abeSchema";
import { matchCompatibilityTable } from "@/services/ocr/TableMatchingService";

export type ABEOverviewProps = {
  vehicleId: string;
  /** Object URL or same-origin URL for the scanned PDF/image. */
  previewUrl: string;
  previewKind?: "pdf" | "image";
  pageCount?: number;
  /** Azure OCR cover text — drives `/api/ocr/parse-abe`. */
  rawText?: string;
  /** Seed / fallback while extraction runs. */
  initialFields?: Partial<AbeMinimal>;
  /** Garage vehicle — enables Verwendungsbereich match on refine. */
  vehicleContext?: AbeVehicleContext | null;
  /** Skip auto-call when parent already ran specialized parse. */
  autoExtract?: boolean;
  isSaving?: boolean;
  /** Extra error from parent save path. */
  saveError?: string | null;
  onSave: (fields: AbeMinimal) => void | Promise<void>;
  onCancel?: () => void;
};

const MATCH_STATUS_COPY: Record<
  AbeUserVehicleMatchStatus,
  { title: string; tone: "ok" | "warn" | "muted" }
> = {
  verified: {
    title: "Fahrzeug in Verwendungsbereich gefunden",
    tone: "ok",
  },
  not_found: {
    title: "Fahrzeug nicht in der Freigabeliste gefunden",
    tone: "warn",
  },
  needs_manual_check: {
    title: "Verwendungsbereich unklar — bitte manuell prüfen",
    tone: "muted",
  },
};

/**
 * Minimal ABE review: cover-page summary fields + PDF preview.
 * Technical specs / Freigabe stay in the saved PDF.
 */
export function ABEOverview({
  vehicleId,
  previewUrl,
  previewKind = "image",
  pageCount = 1,
  rawText = "",
  initialFields,
  vehicleContext = null,
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
    extract,
  } = useAbeExtraction({
    vehicleId,
    rawText,
    initialFields,
    autoExtract,
    vehicleContext,
  });

  const bannerError = saveError ?? extractError;
  const vehicleLabel = vehicleContext
    ? formatAbeVehicleContextLabel(vehicleContext)
    : null;
  const matchStatus = fields.userVehicleMatchStatus;
  const matchCopy = matchStatus ? MATCH_STATUS_COPY[matchStatus] : null;
  const compatibilityTable = useMemo((): TableData | null => {
    if (fields.compatibilityTable?.rows.length) {
      return matchCompatibilityTable(
        fields.compatibilityTable,
        vehicleContext,
      );
    }
    if (
      fields.userVehicleMatchStatus === "verified" &&
      fields.matchedVehicleRow
    ) {
      return {
        caption: "Verwendungsbereich",
        headers: ["Fahrzeug / Zeile", "Auflagen"],
        rows: [
          {
            id: "matched-row",
            cells: [
              fields.matchedVehicleRow,
              fields.matchedConditions?.join("; ") || "—",
            ],
            isUserVehicleMatch: true,
            matchReason: vehicleLabel
              ? `Matched to ${vehicleLabel}`
              : "Matched from extraction",
          },
        ],
      };
    }
    return null;
  }, [
    fields.compatibilityTable,
    fields.matchedConditions,
    fields.matchedVehicleRow,
    fields.userVehicleMatchStatus,
    vehicleContext,
    vehicleLabel,
  ]);

  return (
    <div className="vd-anim-header flex flex-col gap-4">
      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)] sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Summary
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
              ABE Kern­daten
            </h2>
            <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
              {vehicleLabel
                ? `Titelseite + Check für ${vehicleLabel}`
                : "Titelseite · Details im gespeicherten PDF"}
            </p>
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
          </div>
        ) : (
          <div className="mt-4 space-y-4" aria-busy={isRefreshing}>
            {isRefreshing ? (
              <p className="flex items-center gap-2 text-[0.75rem] text-[color:var(--vd-muted)]">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Felder werden gelesen…
              </p>
            ) : null}
            <AbeKbaHero
              value={fields.kbaNumber ?? ""}
              isEditing={isEditing}
              onChange={(event) =>
                updateField("kbaNumber", event.target.value || null)
              }
            />

            {isEditing ? (
              <div className="space-y-3">
                <AbeFieldLabel label="Hersteller">
                  <Input
                    value={fields.manufacturer ?? ""}
                    onChange={(event) =>
                      updateField("manufacturer", event.target.value || null)
                    }
                    placeholder="z. B. MS Design"
                  />
                </AbeFieldLabel>
                <AbeFieldLabel label="Prüforganisation">
                  <Input
                    value={fields.testingOrganization ?? ""}
                    onChange={(event) =>
                      updateField(
                        "testingOrganization",
                        event.target.value || null,
                      )
                    }
                    placeholder="z. B. TÜV SÜD Automotive GmbH"
                  />
                </AbeFieldLabel>
                <AbeFieldLabel label="Kategorie">
                  <Input
                    value={fields.partCategory ?? ""}
                    onChange={(event) =>
                      updateField("partCategory", event.target.value || null)
                    }
                    placeholder="z. B. Frontspoiler"
                  />
                </AbeFieldLabel>
                <AbeFieldLabel label="Typ / Modell">
                  <Input
                    value={fields.partType ?? ""}
                    onChange={(event) =>
                      updateField("partType", event.target.value || null)
                    }
                    placeholder="z. B. 3C5 071 609"
                  />
                </AbeFieldLabel>
              </div>
            ) : (
              <dl className="grid gap-2.5 text-[0.88rem]">
                <AbeSummaryRow label="Hersteller" value={fields.manufacturer} />
                <AbeSummaryRow
                  label="Prüforganisation"
                  value={fields.testingOrganization}
                />
                <AbeSummaryRow label="Kategorie" value={fields.partCategory} />
                <AbeSummaryRow label="Typ / Modell" value={fields.partType} />
              </dl>
            )}

            {matchCopy ? (
              <div
                className={[
                  "rounded-2xl border px-4 py-3",
                  matchCopy.tone === "ok"
                    ? "border-emerald-500/25 bg-emerald-500/8"
                    : matchCopy.tone === "warn"
                      ? "border-amber-300/80 bg-amber-50"
                      : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]",
                ].join(" ")}
              >
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                  Fahrzeug-Check
                  {vehicleLabel ? ` · ${vehicleLabel}` : ""}
                </p>
                <p className="mt-1 text-[0.92rem] font-medium text-[color:var(--vd-text)]">
                  {matchCopy.title}
                </p>
                {fields.matchedVehicleRow && !compatibilityTable ? (
                  <p className="mt-2 text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
                    {fields.matchedVehicleRow}
                  </p>
                ) : null}
                {fields.matchedConditions?.length && !compatibilityTable ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[0.78rem] text-[color:var(--vd-text)]">
                    {fields.matchedConditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {compatibilityTable ? (
              <CompatibilityTable
                table={compatibilityTable}
                className="border-0 bg-transparent p-0 shadow-none"
              />
            ) : null}
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
            disabled={isLoading || isSaving}
            onClick={() => {
              if (!isEditing) setIsEditing(false);
              void onSave(fields);
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
    </div>
  );
}
