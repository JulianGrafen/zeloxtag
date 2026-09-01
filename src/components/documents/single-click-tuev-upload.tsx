"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  FileText,
  Info,
  LoaderCircle,
  RotateCcw,
  Save,
  ShieldAlert,
} from "lucide-react";

import type { ApprovalFields } from "@/lib/documents/approval-fields";
import {
  formatTuevYearMonth,
  localDateIso,
  normalizeDocumentDateIso,
} from "@/lib/documents/format";
import { isMileagePlausibilityMessage } from "@/lib/documents/mileage-plausibility-message";
import { uploadDocument } from "@/lib/documents/upload-document";
import { validateMileageAgainstHistory } from "@/lib/documents/validate-mileage";
import { prepareTuevSingleOcrFile } from "@/lib/ocr/prepare-client-ocr-file";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import type { TuevVisionExtraction } from "@/services/ocr/TuevExtractionService";
import {
  type TuevResult,
} from "@/lib/validations/documentSchemas";
import { Button } from "@/components/ui/button";
import {
  draftRowsToReportDefects,
  emptyDraftRow,
  parseDraftRows,
  toDraftRows,
  type DraftDefect,
} from "@/components/documents/tuev-defects-draft-editor";
import { TuevDefectsEditableBlock } from "@/components/documents/tuev-defects-editable-block";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import type { Document } from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_MIME = "image/*,application/pdf,.pdf";

const RESULT_LABELS: Record<TuevResult, string> = {
  no_defects: "Ohne Mängel",
  minor_defects: "Geringe Mängel",
  major_defects: "Erhebliche Mängel",
  dangerous_defects: "Gefährliche Mängel",
  failed: "Nicht bestanden",
};

const RESULT_COLOR: Record<TuevResult, string> = {
  no_defects: "text-emerald-700",
  minor_defects: "text-amber-700",
  major_defects: "text-orange-700",
  dangerous_defects: "text-red-700",
  failed: "text-red-900",
};

const PROCESSING_MESSAGES = [
  "Dokument wird an die KI übergeben…",
  "Fahrzeugdaten & KM-Stand werden ausgelesen…",
  "Prüfergebnis & nächste HU werden erkannt…",
  "Mängel werden erkannt…",
  "Finalisierung…",
];

const PROCESS_MESSAGE_INTERVAL_MS = 3_000;

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadPhase = "idle" | "processing" | "confirm" | "saving" | "success" | "error";

interface ExtractionState {
  extraction: TuevVisionExtraction;
  uploadFile: File;
}

export interface SingleClickTuevUploadProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  existingDocuments?: Document[];
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function toUploadPdf(file: File): Promise<File> {
  if (isPdf(file)) return file;
  const result = await convertImagesToPdf([file], {
    fileName: `tuev-upload-${Date.now()}`,
    fullBleed: true,
    imageCompression: "MEDIUM",
  });
  return result.file;
}

function buildDocumentTitle(extraction: TuevVisionExtraction): string {
  const { report, vendor } = extraction;
  const orgLabel =
    report.testingOrganization !== "other"
      ? report.testingOrganization
      : null;
  const station = vendor?.trim() || orgLabel || "Prüforganisation";
  return `TÜV / HU · ${station}`.slice(0, 120);
}

function buildSaveFormData(
  extraction: TuevVisionExtraction,
  uploadFile: File,
  vehicleId: string,
  tagUuid: string,
  title: string,
  options?: { forceMileageSave?: boolean },
): FormData {
  const { report, vendor, amount, lineItems } = extraction;
  const orgLabel =
    report.testingOrganization !== "other"
      ? report.testingOrganization
      : "Prüforganisation";
  const vendorLabel = vendor?.trim() || orgLabel;
  const approvalPayload: ApprovalFields = { kind: "tuev", data: report };

  const formData = new FormData();
  formData.set("vehicleId", vehicleId);
  formData.set("tagUuid", tagUuid);
  formData.set("title", title);
  formData.set("type", "tuev");
  formData.set("category", "tuev");
  formData.set("vendor", vendorLabel);
  formData.set("date", report.testDate?.trim() ?? localDateIso());
  formData.set("amount", amount === null ? "" : String(amount));
  formData.set(
    "lineItems",
    lineItems?.length ? JSON.stringify(lineItems) : "",
  );
  formData.set("kbaNumber", "");
  formData.set("vehicleApprovals", "");
  formData.set("authority", report.testingOrganization);
  formData.set("conditions", "");
  formData.set("technicalSpecs", "");
  formData.set("partCategory", "");
  formData.set(
    "notes",
    report.requiresManualReview
      ? "Manuelle Prüfung empfohlen — einige Felder wurden nicht zuverlässig erkannt."
      : "",
  );
  formData.set("manufacturer", "");
  formData.set("invoiceNumber", report.documentNumber?.trim() ?? "");
  formData.set(
    "mileageKm",
    report.mileageKm === null ? "" : String(report.mileageKm),
  );
  formData.set("pageCount", "1");
  formData.set("approvalFields", JSON.stringify(approvalPayload));
  if (options?.forceMileageSave) {
    formData.set("forceMileageSave", "1");
  }
  formData.set("file", uploadFile);
  return formData;
}

// ─── Processing animation hook ────────────────────────────────────────────────

function useProcessingMessage(active: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => {
      setIndex((prev) =>
        prev < PROCESSING_MESSAGES.length - 1 ? prev + 1 : prev,
      );
    }, PROCESS_MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  return PROCESSING_MESSAGES[index] ?? PROCESSING_MESSAGES[0]!;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[0.78rem] text-[color:var(--vd-muted)]">{label}</span>
      <span
        className={[
          "text-[0.85rem] font-medium",
          highlight ?? "text-[color:var(--vd-text)]",
        ].join(" ")}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Single-Click TÜV Upload — drop a PDF or photo, get structured data extracted
 * automatically without guided multi-step capture.
 *
 * Trades some accuracy for speed — user is warned upfront.
 * A manual review banner is shown when the LLM is uncertain.
 */
export function SingleClickTuevUpload({
  vehicleId,
  tagUuid,
  vehicleLabel,
  existingDocuments = [],
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: SingleClickTuevUploadProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [state, setState] = useState<ExtractionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [saving, startSaveTransition] = useTransition();
  const [defectsDraft, setDefectsDraft] = useState<DraftDefect[]>([
    emptyDraftRow(),
  ]);

  const processingMessage = useProcessingMessage(phase === "processing");
  const inputRef = useRef<HTMLInputElement>(null);

  const mileageWarning = useMemo(() => {
    if (!state) return null;
    const km = state.extraction.report.mileageKm;
    if (km === null || km <= 0 || existingDocuments.length === 0) {
      return null;
    }
    const check = validateMileageAgainstHistory(
      km,
      normalizeDocumentDateIso(state.extraction.report.testDate),
      existingDocuments,
    );
    return check.ok ? null : check.warning;
  }, [existingDocuments, state]);

  // ── File handling ────────────────────────────────────────────────────────────

  async function processFile(file: File) {
    setError(null);
    setPhase("processing");

    try {
      const ocrFile = await prepareTuevSingleOcrFile(file);
      const body = new FormData();
      body.set("vehicleId", vehicleId);
      body.set("file", ocrFile);

      const response = await fetch("/api/ocr/tuev/single", {
        method: "POST",
        body,
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; extraction: TuevVisionExtraction }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : `Analyse fehlgeschlagen (${response.status}).`,
        );
      }

      // 2. Ensure we have a PDF for Supabase storage.
      const uploadFile = await toUploadPdf(file);

      const draft = toDraftRows(payload.extraction.report);
      setDefectsDraft(draft.length > 0 ? draft : [emptyDraftRow()]);
      setState({ extraction: payload.extraction, uploadFile });
      setPhase("confirm");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Analyse fehlgeschlagen. Bitte erneut versuchen.",
      );
      setPhase("error");
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  function handleSave(forceMileage = false) {
    if (!state) return;

    setSaveError(null);
    if (mileageWarning && !forceMileage) {
      setSaveError(mileageWarning);
      return;
    }

    const reportWithDefects = {
      ...state.extraction.report,
      ...draftRowsToReportDefects(defectsDraft),
    };

    const extraction = {
      ...state.extraction,
      report: reportWithDefects,
    };

    const title = buildDocumentTitle(extraction);
    const formData = buildSaveFormData(
      extraction,
      state.uploadFile,
      vehicleId,
      tagUuid,
      title,
      { forceMileageSave: forceMileage },
    );

    startSaveTransition(async () => {
      const result = await uploadDocument(formData);
      if (result.status === "error") {
        if (isMileagePlausibilityMessage(result.message)) {
          setSaveError(result.message);
          return;
        }
        setSaveError(result.message);
        return;
      }
      setSavedDocumentId(result.document.id);
      setPhase("success");
    });
  }

  function retry() {
    setError(null);
    setSaveError(null);
    setState(null);
    setDefectsDraft([emptyDraftRow()]);
    setPhase("idle");
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const backButton = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
    >
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </button>
  ) : backHref ? (
    <PressableLink
      href={backHref}
      variant="pill"
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
    >
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </PressableLink>
  ) : null;

  // ── Success ──────────────────────────────────────────────────────────────────

  if (phase === "success") {
    const href =
      successHref ??
      (savedDocumentId
        ? `/v/${tagUuid}/dokumente/${savedDocumentId}`
        : `/v/${tagUuid}/dokumente`);

    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-6 px-4 py-6">
        {backButton}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[1.5rem] font-semibold tracking-[-0.03em]">
              Gespeichert!
            </h2>
            <p className="mt-2 text-[0.88rem] text-[color:var(--vd-muted)]">
              {vehicleLabel} · TÜV-Bericht wurde erfolgreich archiviert.
            </p>
          </div>
          <PressableLink href={href} variant="pill" className="claim-cta px-8">
            Zum Dokument
          </PressableLink>
        </div>
      </section>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-6 px-4 py-6">
        {backButton}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100">
            <ShieldAlert className="h-10 w-10 text-red-600" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em]">
              Analyse fehlgeschlagen
            </h2>
            {error ? (
              <p className="mt-2 text-[0.82rem] text-[color:var(--vd-muted)]">
                {error}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={retry}
            className="claim-back inline-flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Erneut versuchen
          </button>
        </div>
      </section>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────────

  if (phase === "processing") {
    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center gap-8 px-4 py-6 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* Outer ring animation */}
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-neutral-100 border-t-neutral-900" />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <FileText className="h-7 w-7 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[1rem] font-semibold text-[color:var(--vd-text)]">
            {processingMessage}
          </p>
          <p className="text-[0.8rem] text-[color:var(--vd-muted)]">
            Dauert etwa 10–20 Sekunden
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {PROCESSING_MESSAGES.map((_, index) => (
            <div
              key={index}
              className={[
                "h-1.5 w-6 rounded-full transition-all duration-500",
                index <= PROCESSING_MESSAGES.indexOf(processingMessage)
                  ? "bg-neutral-900"
                  : "bg-neutral-200",
              ].join(" ")}
            />
          ))}
        </div>
      </section>
    );
  }

  // ── Confirm ──────────────────────────────────────────────────────────────────

  if (phase === "confirm" && state) {
    const { report, vendor, amount } = state.extraction;
    const needsReview = state.extraction.requiresManualReview;
    const activeMileageWarning = saveError ?? mileageWarning;

    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
        {backButton}

        {/* Header */}
        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            TÜV / HU · Erkannt
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            Bericht auslesen
          </h1>
          <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
            {vehicleLabel} · Bitte kurz prüfen, dann speichern.
          </p>
        </div>

        {/* Manual review warning */}
        {needsReview ? (
          <div className="flex gap-3 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="text-[0.8rem] text-amber-900">
              <p className="font-semibold">Manuelle Prüfung empfohlen</p>
              <p className="mt-0.5 leading-relaxed text-amber-800">
                Einige Felder konnten nicht sicher erkannt werden. Bitte die
                Angaben nach dem Speichern im Dashboard kontrollieren.
              </p>
            </div>
          </div>
        ) : null}

        {/* Extraction summary */}
        <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white px-4 py-1 shadow-[var(--vd-shadow-sm)]">
          <div className="divide-y divide-[color:var(--vd-border)]">
            <SummaryRow
              label="Prüforganisation"
              value={
                report.testingOrganization !== "other"
                  ? report.testingOrganization
                  : vendor?.trim() || "Sonstige"
              }
            />
            <SummaryRow label="Prüfstation" value={vendor?.trim() ?? null} />
            <SummaryRow label="Prüfdatum" value={report.testDate ?? null} />
            <div className="py-2.5">
              <span className="block text-[0.78rem] text-[color:var(--vd-muted)]">
                Kilometerstand
              </span>
              <MileageKmInput
                value={report.mileageKm}
                onChange={(km) => {
                  setSaveError(null);
                  setState((current) =>
                    current
                      ? {
                          ...current,
                          extraction: {
                            ...current.extraction,
                            report: {
                              ...current.extraction.report,
                              mileageKm: km,
                            },
                          },
                        }
                      : current,
                  );
                }}
                placeholder="z. B. 87.200"
                className="mt-1.5"
              />
            </div>
            <SummaryRow
              label="Ergebnis"
              value={RESULT_LABELS[report.result]}
              highlight={RESULT_COLOR[report.result]}
            />
            <SummaryRow
              label="Nächste HU"
              value={formatTuevYearMonth(report.nextInspectionDate)}
            />
            {amount !== null ? (
              <SummaryRow
                label="Prüfgebühr"
                value={`${amount.toFixed(2).replace(".", ",")} €`}
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Festgestellte Mängel
          </h2>
          <p className="mb-3 text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
            Mängel prüfen oder ergänzen — tippen zum Bearbeiten. Leere Zeilen
            werden nicht gespeichert.
          </p>
          <TuevDefectsEditableBlock
            draft={defectsDraft}
            onChange={setDefectsDraft}
            disabled={saving}
          />
        </div>

        {activeMileageWarning ? (
          <div
            role="alert"
            className="flex gap-3 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3.5"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-[0.8rem] leading-relaxed text-amber-900">
              {activeMileageWarning}
            </p>
          </div>
        ) : null}

        {saveError && !isMileagePlausibilityMessage(saveError) ? (
          <div
            role="alert"
            className="flex gap-3 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3.5"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <p className="text-[0.8rem] leading-relaxed text-red-900">
              {saveError}
            </p>
          </div>
        ) : null}

        {/* Save action */}
        {activeMileageWarning ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="claim-cta"
              disabled={saving}
              onClick={() => handleSave(true)}
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Wird gespeichert…" : "Trotzdem speichern"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setSaveError(null)}
            >
              KM korrigieren
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            className="claim-cta"
            disabled={saving}
            onClick={() => handleSave(false)}
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Wird gespeichert…" : "Bericht speichern"}
          </Button>
        )}

        <button
          type="button"
          onClick={retry}
          className="flex items-center justify-center gap-1.5 py-2 text-[0.8rem] text-[color:var(--vd-muted)] transition-opacity active:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Anderes Dokument hochladen
        </button>
      </section>
    );
  }

  // ── Idle (dropzone) ───────────────────────────────────────────────────────────

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
      {backButton}

      {/* Header */}
      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <CloudUpload className="h-5 w-5" />
        </div>
        <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          TÜV / HU · Schnell-Upload
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          Foto oder PDF hochladen
        </h1>
        <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
          {vehicleLabel}
        </p>
      </div>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="TÜV-Bericht hochladen"
        className={[
          "flex cursor-pointer flex-col items-center gap-4 rounded-[1.35rem] border-2 border-dashed px-6 py-10 text-center transition-colors duration-150",
          isDragOver
            ? "border-neutral-900 bg-neutral-50"
            : "border-[color:var(--vd-border)] hover:border-neutral-400",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME}
          className="sr-only"
          onChange={handleFileInput}
          aria-hidden="true"
        />

        <div
          className={[
            "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-150",
            isDragOver ? "bg-neutral-900" : "bg-neutral-100",
          ].join(" ")}
        >
          <CloudUpload
            className={[
              "h-7 w-7 transition-colors",
              isDragOver ? "text-white" : "text-neutral-500",
            ].join(" ")}
          />
        </div>

        <div>
          <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
            {isDragOver
              ? "Loslassen zum Hochladen"
              : "PDF oder Foto hier ablegen"}
          </p>
          <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
            oder klicken · PDF, JPEG, PNG, WebP
          </p>
        </div>
      </div>

      <div className="flex gap-3 rounded-[1.2rem] border border-neutral-200 bg-neutral-50 px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
        <div className="text-[0.8rem] text-neutral-700">
          <p className="font-semibold text-neutral-900">
            Hinweis: Geringere Genauigkeit
          </p>
          <p className="mt-0.5 leading-relaxed">
            Der Schnell-Upload analysiert das Dokument in einem Schritt — bei
            mehrseitigen Berichten oder schlechter Bildqualität können Felder
            fehlen. Für 100&nbsp;% Genauigkeit den{" "}
            <strong>Geführten Scan</strong> verwenden.
          </p>
        </div>
      </div>
    </section>
  );
}
