"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  SkipForward,
} from "lucide-react";

import { TuevOverview } from "@/components/dashboard/TuevOverview";
import type { TuevReviewFields } from "@/components/dashboard/TuevOverview";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { SingleClickTuevUpload } from "@/components/documents/single-click-tuev-upload";
import { Button } from "@/components/ui/button";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { localDateIso } from "@/lib/documents/format";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import type { InvoiceLineItem, InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import { normalizeTextParseResult } from "@/lib/ocr/text-parse-schema";
import { uploadDocument } from "@/lib/documents/upload-document";
import {
  TESTING_ORGANIZATIONS,
  TUEV_RESULTS,
  type TuevReport,
  type TestingOrganization,
  type TuevResult,
} from "@/lib/validations/documentSchemas";
import type {
  TuevDefectsExtraction,
  TuevHeaderExtraction,
} from "@/services/ocr/TuevExtractionService";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardPhase =
  | "mode-select"
  | "single-click"
  | "step1-camera"
  | "step1-analyzing"
  | "step2-prompt"
  | "step2-camera"
  | "step2-analyzing"
  | "review";

interface WizardState {
  phase: WizardPhase;
  headerFile: File | null;
  defectsFile: File | null;
  headerExtraction: TuevHeaderExtraction | null;
  defectsExtraction: TuevDefectsExtraction | null;
  uploadFile: File | null;
  previewUrl: string | null;
  previewOwned: boolean;
  error: string | null;
}

export interface TuevUploadWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

// ─── Result label constants ────────────────────────────────────────────────────

const TUEV_RESULT_LABELS: Record<TuevResult, string> = {
  no_defects: "Ohne Mängel",
  minor_defects: "Geringe Mängel",
  major_defects: "Erhebliche Mängel",
  dangerous_defects: "Gefährliche Mängel",
  failed: "Nicht bestanden",
};

const RESULT_HAS_DEFECTS = new Set<TuevResult>([
  "minor_defects",
  "major_defects",
  "dangerous_defects",
  "failed",
]);

// ─── API helpers ──────────────────────────────────────────────────────────────

class TuevApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TuevApiError";
  }
}

async function fetchHeaderExtraction(
  file: File,
): Promise<TuevHeaderExtraction> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", "header");

  const response = await fetch("/api/ocr/tuev", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; extraction: TuevHeaderExtraction }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new TuevApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Analyse fehlgeschlagen (${response.status}).`,
    );
  }
  return payload.extraction;
}

async function fetchDefectsExtraction(
  file: File,
): Promise<TuevDefectsExtraction> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", "defects");

  const response = await fetch("/api/ocr/tuev", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; extraction: TuevDefectsExtraction }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new TuevApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Mängel-Analyse fehlgeschlagen (${response.status}).`,
    );
  }
  return payload.extraction;
}

// ─── Merge extraction results → TuevReport ────────────────────────────────────

function buildTuevReport(
  header: TuevHeaderExtraction,
  defects: TuevDefectsExtraction | null,
): TuevReport {
  return {
    testingOrganization: header.testingOrganization,
    testDate: header.testDate,
    result: header.result,
    mileageKm: header.mileageKm,
    nextInspectionDate: header.nextInspectionDate,
    documentNumber: header.documentNumber,
    defectsTable: defects?.defectsTable ?? null,
    defectsList: defects?.defectsList ?? null,
    requiresManualReview: header.requiresManualReview || undefined,
  };
}

function buildAnalyzeFields(
  header: TuevHeaderExtraction,
  defects: TuevDefectsExtraction | null,
): InvoiceTextParseResult {
  const orgLabel =
    header.testingOrganization !== "other"
      ? header.testingOrganization
      : null;

  return normalizeTextParseResult({
    vendor: header.vendor,
    date: header.testDate,
    amount: header.amount,
    category: "tuev",
    summary: "HU / AU Prüfbericht",
    lineItems: header.lineItems,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: orgLabel,
    conditions: null,
    partCategory: null,
    notes: header.requiresManualReview
      ? "Manuelle Prüfung empfohlen — einige Felder konnten nicht zuverlässig gelesen werden."
      : null,
    manufacturer: null,
    invoiceNumber: header.documentNumber,
    mileageKm: header.mileageKm,
  });
}

// ─── Build upload file (header image or combined PDF) ─────────────────────────

async function buildUploadFile(
  headerFile: File,
  defectsFile: File | null,
): Promise<File> {
  if (!defectsFile) {
    // Single-page: use header file as-is (PDF or image).
    if (
      headerFile.type === "application/pdf" ||
      headerFile.name.toLowerCase().endsWith(".pdf")
    ) {
      return headerFile;
    }
    return headerFile;
  }

  // Two images → combine into a 2-page PDF for storage.
  try {
    const result = await convertImagesToPdf([headerFile, defectsFile], {
      fileName: `tuev-scan-${Date.now()}`,
      fullBleed: true,
      imageCompression: "MEDIUM",
    });
    return result.file;
  } catch {
    // Fallback: just use the header image.
    return headerFile;
  }
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function WizardProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center gap-2" aria-label={`Schritt ${currentStep} von ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={[
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            i < currentStep
              ? "bg-neutral-900"
              : i === currentStep - 1
                ? "bg-neutral-700"
                : "bg-neutral-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Analyzing overlay ────────────────────────────────────────────────────────

function AnalyzingOverlay({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
        <LoaderCircle className="h-7 w-7 animate-spin text-white" />
      </div>
      <div>
        <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
          {label}
        </p>
        <p className="mt-1 text-[0.8rem] text-[color:var(--vd-muted)]">
          Einen Moment bitte…
        </p>
      </div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full w-full animate-pulse rounded-full bg-neutral-400" />
      </div>
    </div>
  );
}

// ─── Header result card ───────────────────────────────────────────────────────

function HeaderResultRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[0.8rem] text-[color:var(--vd-muted)]">{label}</span>
      <span className="text-[0.85rem] font-medium text-[color:var(--vd-text)]">
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Guided TÜV upload wizard.
 *
 * Step 1: In-browser camera → captures header (Kopf/Ergebnis) → LLM extraction.
 * Step 2: If defects found → in-browser camera → captures Punkt 6 → LLM extraction.
 * Review: TuevOverview with merged data → save to Supabase.
 */
export function TuevUploadWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: TuevUploadWizardProps) {
  const [state, setState] = useState<WizardState>({
    phase: "mode-select",
    headerFile: null,
    defectsFile: null,
    headerExtraction: null,
    defectsExtraction: null,
    uploadFile: null,
    previewUrl: null,
    previewOwned: false,
    error: null,
  });
  const [saving, startSaveTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);

  // Revoke object URLs on unmount.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function setPreviewUrl(url: string | null, owned: boolean) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = owned && url ? url : null;
    setState((prev) => ({ ...prev, previewUrl: url, previewOwned: owned }));
  }

  function resetToStart() {
    setPreviewUrl(null, false);
    setState({
      phase: "mode-select",
      headerFile: null,
      defectsFile: null,
      headerExtraction: null,
      defectsExtraction: null,
      uploadFile: null,
      previewUrl: null,
      previewOwned: false,
      error: null,
    });
    setSaveError(null);
  }

  // ── Step 1: user captured header image ──────────────────────────────────────

  async function handleHeaderCapture(file: File) {
    setState((prev) => ({
      ...prev,
      phase: "step1-analyzing",
      headerFile: file,
      error: null,
    }));

    // Create preview URL for the review step (TuevOverview needs it).
    const owned = !file.type.includes("pdf");
    const previewUrl = owned ? URL.createObjectURL(file) : `/api/placeholder-pdf`;
    if (owned) {
      setPreviewUrl(URL.createObjectURL(file), true);
    }

    try {
      const extraction = await fetchHeaderExtraction(file);

      // Build upload file (may be just the header image initially).
      const uploadFile = await buildUploadFile(file, null);
      const finalPreviewUrl = owned ? URL.createObjectURL(file) : null;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = finalPreviewUrl;

      // Auto-skip step 2 when no defects.
      const nextPhase = RESULT_HAS_DEFECTS.has(extraction.result)
        ? "step2-prompt"
        : "review";

      setState((prev) => ({
        ...prev,
        phase: nextPhase,
        headerExtraction: extraction,
        uploadFile,
        previewUrl: finalPreviewUrl,
        previewOwned: owned,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        phase: "step1-camera",
        error:
          error instanceof Error
            ? error.message
            : "Analyse fehlgeschlagen. Bitte erneut versuchen.",
      }));
    }
  }

  // ── Step 2: user captured defects image ─────────────────────────────────────

  async function handleDefectsCapture(file: File) {
    setState((prev) => ({
      ...prev,
      phase: "step2-analyzing",
      defectsFile: file,
      error: null,
    }));

    try {
      const extraction = await fetchDefectsExtraction(file);

      // Rebuild upload file combining header + defects images.
      const headerFile = state.headerFile!;
      const uploadFile = await buildUploadFile(headerFile, file);

      setState((prev) => ({
        ...prev,
        phase: "review",
        defectsExtraction: extraction,
        uploadFile,
        error: null,
      }));
    } catch (error) {
      // Step 2 failure is non-fatal — keep header extraction, go to review.
      setState((prev) => ({
        ...prev,
        phase: "review",
        defectsExtraction: null,
        error:
          error instanceof Error
            ? `Mängel konnten nicht gelesen werden (${error.message}). Bitte manuell prüfen.`
            : "Mängel-Analyse fehlgeschlagen — bitte manuell prüfen.",
      }));
    }
  }

  function skipDefects() {
    setState((prev) => ({
      ...prev,
      phase: "review",
      defectsExtraction: null,
      error: null,
    }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  function handleSave(payload: {
    review: TuevReviewFields;
    approvalFields: Extract<ApprovalFields, { kind: "tuev" }>;
    title: string;
  }) {
    if (!state.uploadFile) {
      setSaveError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    setSaveError(null);
    const { review, approvalFields: approval, title } = payload;
    const vendorLabel =
      review.workshopName?.trim() ||
      (review.testingOrganization === "other"
        ? "Prüforganisation"
        : review.testingOrganization);

    startSaveTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", title);
      formData.set("type", "tuev");
      formData.set("category", "tuev");
      formData.set("vendor", vendorLabel);
      formData.set("date", review.testDate?.trim() ?? localDateIso());
      formData.set(
        "amount",
        review.amount === null ? "" : String(review.amount),
      );
      formData.set(
        "lineItems",
        review.lineItems?.length ? JSON.stringify(review.lineItems) : "",
      );
      formData.set("kbaNumber", "");
      formData.set("vehicleApprovals", "");
      formData.set("authority", review.testingOrganization);
      formData.set("conditions", "");
      formData.set("technicalSpecs", "");
      formData.set("partCategory", "");
      formData.set("notes", "");
      formData.set("manufacturer", "");
      formData.set("invoiceNumber", review.documentNumber?.trim() ?? "");
      formData.set(
        "mileageKm",
        review.mileageKm === null ? "" : String(review.mileageKm),
      );
      formData.set("pageCount", state.defectsFile ? "2" : "1");
      formData.set("approvalFields", JSON.stringify(approval));
      formData.set("file", state.uploadFile!);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setSaveError(result.message);
        return;
      }

      const href =
        successHref ?? `/v/${result.tagUuid}/dokumente/${result.document.id}`;
      window.location.assign(href);
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const { phase, headerExtraction, defectsExtraction, error } = state;

  // ── Mode selector ────────────────────────────────────────────────────────────

  if (phase === "mode-select") {
    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
        {/* Back */}
        <header>
          {onBack ? (
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
          ) : null}
        </header>

        {/* Heading card */}
        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <ScanLine className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            TÜV / HU · Upload
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            Wie möchtest du scannen?
          </h1>
          <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
            {vehicleLabel}
          </p>
        </div>

        {/* Option 1: Guided Wizard (recommended) */}
        <button
          type="button"
          onClick={() =>
            setState((prev) => ({ ...prev, phase: "step1-camera" }))
          }
          className="group relative w-full rounded-[1.35rem] border-2 border-neutral-900 bg-neutral-900 p-5 text-left text-white shadow-[var(--vd-shadow)] transition-opacity active:opacity-80"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/50">
                Empfohlen
              </p>
              <p className="mt-1 text-[1rem] font-semibold">Geführter Scan</p>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-white/65">
                In-Browser-Kamera · Schritt für Schritt · maximale Genauigkeit
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium">
              2 Schritte
            </span>
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium">
              ~60 Sek.
            </span>
            <span className="rounded-lg bg-emerald-400/20 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-300">
              100 % Genauigkeit
            </span>
          </div>
        </button>

        {/* Option 2: Single-click (with accuracy warning) */}
        <button
          type="button"
          onClick={() =>
            setState((prev) => ({ ...prev, phase: "single-click" }))
          }
          className="group w-full rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-left shadow-[var(--vd-shadow-sm)] transition-colors hover:border-neutral-300 active:bg-neutral-50"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
                Schnell-Upload
              </p>
              <p className="mt-1 text-[1rem] font-semibold text-[color:var(--vd-text)]">
                PDF oder Foto hochladen
              </p>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
                Direkt aus der Galerie — kein Kamera-Flow nötig
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)]">
              <ArrowRight className="h-5 w-5 text-[color:var(--vd-muted)]" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-lg border border-[color:var(--vd-border)] bg-neutral-100 px-2.5 py-1 text-[0.7rem] font-medium text-neutral-600">
              1 Schritt
            </span>
            <span className="rounded-lg border border-[color:var(--vd-border)] bg-neutral-100 px-2.5 py-1 text-[0.7rem] font-medium text-neutral-600">
              ~15 Sek.
            </span>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.7rem] font-medium text-amber-700">
              Weniger genau
            </span>
          </div>
        </button>
      </section>
    );
  }

  // ── Single-click mode ────────────────────────────────────────────────────────

  if (phase === "single-click") {
    return (
      <SingleClickTuevUpload
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        successHref={successHref}
        onBack={() => setState((prev) => ({ ...prev, phase: "mode-select" }))}
      />
    );
  }

  // Camera views are full-screen — render outside the normal page shell.
  if (phase === "step1-camera") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Dokumentenkopf fotografieren"
          hint="Schritt 1 von 2"
          guideLabel="Kopf mit KM-Stand, FIN und Ergebnis"
          allowPdf
          onCapture={(file) => void handleHeaderCapture(file)}
          onClose={onBack ?? (() => window.history.back())}
        />
      </>
    );
  }

  if (phase === "step2-camera") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Mängel-Nachweis fotografieren"
          hint="Schritt 2 von 2 · Abschnitt 6"
          guideLabel="Punkt 6 — Festgestellte Mängel"
          onCapture={(file) => void handleDefectsCapture(file)}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "step2-prompt" }))
          }
        />
      </>
    );
  }

  // Page-shell views.
  const showTotalSteps = phase === "step2-prompt" || phase === "step2-analyzing" || phase === "review"
    ? 2
    : 1;
  const showCurrentStep =
    phase === "step1-analyzing" || phase === "step2-prompt" ? 1
    : phase === "step2-analyzing" ? 2
    : phase === "review" ? showTotalSteps
    : 1;

  const isReview = phase === "review" && !!headerExtraction;

  if (isReview && state.previewUrl && state.uploadFile) {
    const mergedReport = buildTuevReport(headerExtraction!, defectsExtraction);
    const mergedFields = buildAnalyzeFields(headerExtraction!, defectsExtraction);
    const approvalFields: ApprovalFields = { kind: "tuev", data: mergedReport };
    const isPdf =
      state.uploadFile.type === "application/pdf" ||
      state.uploadFile.name.toLowerCase().endsWith(".pdf");

    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-6 px-4 py-6">
        {state.error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.82rem] text-amber-900">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
            {state.error}
          </div>
        ) : null}
        <TuevOverview
          previewUrl={state.previewUrl}
          previewKind={isPdf ? "pdf" : "image"}
          pageCount={state.defectsFile ? 2 : 1}
          fields={mergedFields}
          approvalFields={approvalFields}
          isSaving={saving}
          saveError={saveError}
          onCancel={resetToStart}
          onSave={handleSave}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-0 px-4 py-6">
      {/* Back button */}
      <header className="mb-6 space-y-4">
        {onBack ? (
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
        ) : null}

        {/* Card */}
        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <ScanLine className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            TÜV / HU · Guided Scan
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            {phase === "step1-analyzing"
              ? "Kopf wird analysiert…"
              : phase === "step2-prompt"
                ? "Mängel-Nachweis"
                : phase === "step2-analyzing"
                  ? "Mängel werden analysiert…"
                  : "TÜV-Bericht scannen"}
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--vd-muted)]">
            {vehicleLabel}
          </p>
        </div>

        {/* Progress bar */}
        <WizardProgress
          currentStep={showCurrentStep}
          totalSteps={showTotalSteps}
        />
      </header>

      {/* ── Step 1 analyzing ─────────────────────────────────────── */}
      {phase === "step1-analyzing" ? (
        <AnalyzingOverlay label="Dokumentenkopf wird ausgelesen…" />
      ) : null}

      {/* ── Step 2 prompt ────────────────────────────────────────── */}
      {phase === "step2-prompt" && headerExtraction ? (
        <div className="space-y-4">
          {/* Header result summary */}
          <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white px-4 py-2 shadow-[var(--vd-shadow-sm)]">
            <p className="py-2 text-[0.7rem] font-medium uppercase tracking-[0.15em] text-[color:var(--vd-muted)]">
              Schritt 1 · Ergebnis
            </p>
            <div className="divide-y divide-[color:var(--vd-border)]">
              <HeaderResultRow
                label="Organisation"
                value={
                  headerExtraction.testingOrganization !== "other"
                    ? headerExtraction.testingOrganization
                    : "Sonstige"
                }
              />
              <HeaderResultRow
                label="Prüfdatum"
                value={headerExtraction.testDate ?? null}
              />
              <HeaderResultRow
                label="Kilometerstand"
                value={
                  headerExtraction.mileageKm !== null
                    ? `${headerExtraction.mileageKm.toLocaleString("de-DE")} km`
                    : null
                }
              />
              <HeaderResultRow
                label="Ergebnis"
                value={
                  <span
                    className={
                      RESULT_HAS_DEFECTS.has(headerExtraction.result)
                        ? "font-semibold text-amber-700"
                        : "font-semibold text-emerald-700"
                    }
                  >
                    {TUEV_RESULT_LABELS[headerExtraction.result]}
                  </span>
                }
              />
              <HeaderResultRow
                label="Nächste HU"
                value={headerExtraction.nextInspectionDate ?? null}
              />
            </div>
          </div>

          {/* Defects prompt */}
          <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-[0.88rem] font-semibold text-amber-900">
                  Mängel festgestellt
                </p>
                <p className="mt-1 text-[0.8rem] leading-relaxed text-amber-800">
                  Fotografiere jetzt Abschnitt 6 des Berichts — dort stehen die
                  festgestellten Mängel (Prüfpunkte).
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            className="claim-cta w-full"
            onClick={() =>
              setState((prev) => ({ ...prev, phase: "step2-camera" }))
            }
          >
            <ScanLine className="h-4 w-4" />
            Mängel-Abschnitt fotografieren
            <ArrowRight className="h-4 w-4" />
          </Button>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[0.82rem] text-[color:var(--vd-muted)] transition-opacity active:opacity-60"
            onClick={skipDefects}
          >
            <SkipForward className="h-3.5 w-3.5" />
            Überspringen — ohne Mängel-Scan
          </button>
        </div>
      ) : null}

      {/* ── Step 2 analyzing ─────────────────────────────────────── */}
      {phase === "step2-analyzing" ? (
        <AnalyzingOverlay label="Mängel werden ausgelesen…" />
      ) : null}

      {/* ── Error display (non-camera phases) ────────────────────── */}
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-800">
          {error}
          <button
            type="button"
            onClick={resetToStart}
            className="mt-2 flex items-center gap-1.5 text-[0.78rem] font-medium text-red-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Erneut versuchen
          </button>
        </div>
      ) : null}
    </section>
  );
}
