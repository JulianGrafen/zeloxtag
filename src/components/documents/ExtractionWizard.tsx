"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  FileUp,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import {
  AbeExtractionFieldsForm,
  isAbeExtractionFormValid,
} from "@/components/documents/abe-extraction-fields-form";
import {
  AbeKbaHero,
  AbeSummaryRow,
} from "@/components/documents/abe-review-ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { abePartArtLabel, titleFromAbeFields } from "@/lib/documents/abe-title";
import { localDateIso } from "@/lib/documents/format";
import { uploadDocument } from "@/lib/documents/upload-document";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import {
  buildClientAuflagenKuerzelDb,
  fetchServerAuflagenKuerzelRecords,
} from "@/lib/ocr/auflagen-kuerzel-client";
import {
  normalizeAuflagenKuerzel,
  type AuflagenKuerzelRecord,
} from "@/lib/ocr/auflagen-kuerzel-db";
import { normalizeAbeKbaDigits } from "@/lib/validations/abeSchema";
import {
  emptyAbeExtractionFormValues,
  formValuesFromVisionExtraction,
  parseAuflagenCodeInput,
  type AbeExtractionFormValues,
  type AbeVisionExtraction,
} from "@/lib/validations/abeVisionExtractionSchemas";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";

type WizardPhase = "upload" | "analyzing" | "review" | "manual" | "confirm";

export interface ExtractionWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

type ExtractApiSuccess = {
  ok: true;
  extraction: AbeVisionExtraction;
  pageCount: number;
  manualFallback: boolean;
};

type ExtractApiError = {
  ok: false;
  error?: string;
  code?: string;
};

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function conditionsFromCodes(
  codes: string[],
  catalog: Map<string, string>,
): string[] {
  return codes.map((code) => {
    const key = normalizeAuflagenKuerzel(code);
    const text = catalog.get(key);
    return text ? `${key}: ${text}` : key;
  });
}

export function ExtractionWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: ExtractionWizardProps) {
  const resolvedSuccessHref =
    successHref ?? `/v/${tagUuid}/dokumente?typ=abe`;
  const resolvedBackHref = backHref ?? `/v/${tagUuid}/dokumente`;

  const [phase, setPhase] = useState<WizardPhase>("upload");
  const [editPhase, setEditPhase] = useState<"review" | "manual">("review");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sourcePdf, setSourcePdf] = useState<File | null>(null);
  const [form, setForm] = useState<AbeExtractionFormValues>(
    emptyAbeExtractionFormValues(),
  );
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [serverKuerzel, setServerKuerzel] = useState<AuflagenKuerzelRecord[]>(
    [],
  );

  const auflagenCatalog = useMemo(
    () => buildClientAuflagenKuerzelDb(serverKuerzel),
    [serverKuerzel],
  );

  useEffect(() => {
    void fetchServerAuflagenKuerzelRecords()
      .then(setServerKuerzel)
      .catch(() => {
        // Seed + local cache still available.
      });
  }, []);

  function resetWizard() {
    setPhase("upload");
    setSelectedFiles([]);
    setSourcePdf(null);
    setForm(emptyAbeExtractionFormValues());
    setConfidenceScore(null);
    setUploadError(null);
    setSaveError(null);
  }

  function handleFileSelection(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploadError(null);

    const incoming = Array.from(fileList);
    const pdfs = incoming.filter(isPdfFile);

    if (pdfs.length > 1) {
      setUploadError("Bitte nur ein PDF oder mehrere Bilder hochladen.");
      return;
    }

    if (pdfs.length === 1 && incoming.length > 1) {
      setUploadError("PDF und Bilder können nicht gemischt werden.");
      return;
    }

    if (pdfs.length === 1) {
      setSourcePdf(pdfs[0]!);
      setSelectedFiles([]);
      return;
    }

    setSourcePdf(null);
    setSelectedFiles(incoming);
  }

  async function runExtraction() {
    const files = sourcePdf ? [sourcePdf] : selectedFiles;
    if (files.length === 0) {
      setUploadError("Bitte mindestens eine Datei auswählen.");
      return;
    }

    setUploadError(null);
    setPhase("analyzing");

    const body = new FormData();
    for (const file of files) {
      body.append(sourcePdf ? "file" : "files", file, file.name);
    }

    try {
      const response = await fetch("/api/documents/abe-extract", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        | ExtractApiSuccess
        | ExtractApiError
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        const message =
          payload && "error" in payload && payload.error
            ? payload.error
            : "Analyse fehlgeschlagen.";
        if (payload && "code" in payload && payload.code === "config") {
          setUploadError(message);
          setPhase("upload");
          return;
        }
        setForm(emptyAbeExtractionFormValues());
        setConfidenceScore(null);
        setPhase("manual");
        return;
      }

      setForm(formValuesFromVisionExtraction(payload.extraction));
      setConfidenceScore(payload.extraction.confidence_score);

      if (payload.manualFallback) {
        setPhase("manual");
      } else {
        setPhase("review");
      }
    } catch {
      setForm(emptyAbeExtractionFormValues());
      setConfidenceScore(null);
      setPhase("manual");
    }
  }

  function handleSave() {
    const kbaDigits = normalizeAbeKbaDigits(form.kbaNumber);
    if (!kbaDigits) {
      setSaveError("Bitte eine gültige KBA-Nummer eingeben.");
      return;
    }

    const codes = parseAuflagenCodeInput(form.auflagenCodes);
    const conditions = conditionsFromCodes(codes, auflagenCatalog);
    const partType = form.partType.trim();
    const title = titleFromAbeFields({
      partType,
      partCategory: partType,
    });

    setSaveError(null);

    startSaveTransition(async () => {
      let uploadFile: File | null = sourcePdf;
      if (!uploadFile) {
        try {
          if (selectedFiles.length === 0) {
            setSaveError("Keine Datei zum Speichern vorhanden.");
            return;
          }
          const pdf = await convertImagesToPdf(selectedFiles, {
            fileName: `abe-${Date.now()}`,
            fullBleed: true,
            imageCompression: "MEDIUM",
          });
          uploadFile = pdf.file;
        } catch {
          uploadFile = selectedFiles[0] ?? null;
        }
      }

      if (!uploadFile) {
        setSaveError("PDF konnte nicht erstellt werden.");
        return;
      }

      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", title);
      formData.set("type", "abe");
      formData.set("category", "abe");
      formData.set("vendor", partType || title);
      formData.set("date", localDateIso());
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", kbaDigits);
      formData.set("vehicleApprovals", JSON.stringify([]));
      formData.set("authority", "");
      formData.set("conditions", JSON.stringify(conditions));
      formData.set(
        "technicalSpecs",
        JSON.stringify(
          partType ? [{ label: "Prüfgegenstand", value: partType }] : [],
        ),
      );
      formData.set("partCategory", abePartArtLabel(partType) ?? "");
      formData.set("notes", "");
      formData.set("manufacturer", "");
      formData.set("invoiceNumber", "");
      formData.set("mileageKm", "");
      formData.set(
        "pageCount",
        String(sourcePdf ? 1 : selectedFiles.length || 1),
      );
      formData.set(
        "approvalFields",
        JSON.stringify({
          kind: "abe",
          data: {
            auflagenSnippets: codes.map((code) => ({
              code,
              text: auflagenCatalog.get(normalizeAuflagenKuerzel(code)) ?? "",
              imageUrl: null,
            })),
          },
        }),
      );
      formData.set("file", uploadFile, uploadFile.name);

      const result = await uploadDocument(formData);
      if (isActionFailure(result)) {
        setSaveError(result.message);
        return;
      }

      window.location.href = resolvedSuccessHref;
    });
  }

  const parsedCodes = parseAuflagenCodeInput(form.auflagenCodes);
  const formValid = isAbeExtractionFormValid(form);

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--vd-border)]"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <PressableLink
            href={resolvedBackHref}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--vd-border)]"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" />
          </PressableLink>
        )}
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            ABE hochladen
          </p>
          <h1 className="text-[1.15rem] font-semibold text-[color:var(--vd-text)]">
            {vehicleLabel}
          </h1>
        </div>
      </header>

      {phase === "upload" ? (
        <div className="space-y-4">
          <div className="rounded-[1.35rem] border border-dashed border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-center shadow-[var(--vd-shadow)]">
            <FileUp className="mx-auto h-8 w-8 text-[color:var(--vd-muted)]" />
            <p className="mt-3 text-[0.92rem] font-medium text-[color:var(--vd-text)]">
              PDF oder Fotos der ABE
            </p>
            <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
              PDF, JPG, PNG oder HEIC · Mehrere Bilder oder ein PDF
            </p>
            <label className="mt-4 inline-flex cursor-pointer">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => handleFileSelection(event.target.files)}
              />
              <span className="inline-flex h-11 items-center rounded-full bg-[color:var(--vd-text)] px-5 text-[0.88rem] font-medium text-[color:var(--vd-surface)]">
                Dateien wählen
              </span>
            </label>
          </div>

          {sourcePdf || selectedFiles.length > 0 ? (
            <div className="rounded-xl border border-emerald-300/70 bg-emerald-50 px-3 py-2.5 text-[0.82rem] text-emerald-950">
              {sourcePdf
                ? `PDF: ${sourcePdf.name}`
                : `${selectedFiles.length} Bild${selectedFiles.length === 1 ? "" : "er"} ausgewählt`}
            </div>
          ) : null}

          {uploadError ? (
            <p role="alert" className="text-[0.78rem] text-amber-800">
              {uploadError}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={!sourcePdf && selectedFiles.length === 0}
            onClick={() => void runExtraction()}
          >
            <Sparkles className="h-4 w-4" />
            Dokument analysieren
          </Button>
        </div>
      ) : null}

      {phase === "analyzing" ? (
        <div
          className="space-y-4"
          role="status"
          aria-live="polite"
          aria-label="Dokument wird analysiert"
        >
          <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
            <div className="flex items-center gap-2 text-[0.88rem] font-medium text-[color:var(--vd-text)]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Dokument wird analysiert…
            </div>
            <p className="mt-2 text-[0.78rem] text-[color:var(--vd-muted)]">
              KBA, Bauteil und Auflagen werden per KI ausgelesen. Das dauert
              meist wenige Sekunden.
            </p>
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : null}

      {phase === "review" || phase === "manual" ? (
        <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)]">
          <header>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              {phase === "manual" ? "Manuelle Eingabe" : "Prüfen & korrigieren"}
            </p>
            <h2 className="mt-1 text-[1.2rem] font-semibold text-[color:var(--vd-text)]">
              {phase === "manual" ? "Daten eintragen" : "Erkannte ABE-Daten"}
            </h2>
          </header>

          <div className="mt-4">
            <AbeExtractionFieldsForm
              values={form}
              onChange={setForm}
              mode={phase === "manual" ? "manual" : "review"}
              confidenceScore={confidenceScore}
              auflagenCatalog={auflagenCatalog}
            />
          </div>

          <div className="mt-5 grid gap-2">
            <Button
              type="button"
              disabled={!formValid}
              onClick={() => {
                setEditPhase(phase === "manual" ? "manual" : "review");
                setPhase("confirm");
              }}
            >
              Weiter zur Bestätigung
            </Button>
            <Button type="button" variant="outline" onClick={resetWizard}>
              <RotateCcw className="h-4 w-4" />
              Neu starten
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "confirm" ? (
        <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)]">
          <header>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Bestätigung
            </p>
            <h2 className="mt-1 text-[1.2rem] font-semibold text-[color:var(--vd-text)]">
              Alles korrekt?
            </h2>
            <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
              Bitte die Werte noch einmal gegen deine ABE prüfen.
            </p>
          </header>

          <div className="mt-4 space-y-3">
            <AbeKbaHero value={form.kbaNumber} />
            <dl className="grid gap-2.5">
              <AbeSummaryRow label="Prüfgegenstand" value={form.partType || "—"} />
              <AbeSummaryRow
                label="Auflagen"
                value={parsedCodes.join(", ") || "—"}
              />
            </dl>
          </div>

          {saveError ? (
            <p role="alert" className="mt-4 text-[0.78rem] text-amber-800">
              {saveError}
            </p>
          ) : null}

          <div className="mt-5 grid gap-2">
            <Button type="button" disabled={isSaving} onClick={handleSave}>
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Speichern…
                </span>
              ) : (
                "Ja, alles korrekt — ABE speichern"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setPhase(editPhase)}
            >
              Zurück & bearbeiten
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
