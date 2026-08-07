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
  TuevOverviewExtraction,
} from "@/services/ocr/TuevExtractionService";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardPhase =
  | "mode-select"
  | "single-click"
  // ── Capture phases (no LLM calls — user just takes photos) ────────────────
  | "capture-overview"         // Step 1/3: photograph the entire document
  | "capture-header"           // Step 2/3: photograph Dokumentenkopf
  | "capture-defects-prompt"   // Step 3/3: ask if defects present
  | "capture-defects"          // Step 3/3: photograph Mängel section
  // ── Post-capture ──────────────────────────────────────────────────────────
  | "analyzing"                // All LLM extractions run here in parallel
  | "review";                  // TuevOverview edit + save

interface WizardState {
  phase: WizardPhase;
  overviewFile: File | null;
  headerFile: File | null;
  defectsFile: File | null;
  overviewExtraction: TuevOverviewExtraction | null;
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

async function callTuevStep<T>(file: File, step: string, label: string): Promise<T> {
  const body = new FormData();
  body.set("file", file);
  body.set("step", step);

  const response = await fetch("/api/ocr/tuev", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; extraction: T }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new TuevApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `${label} fehlgeschlagen (${response.status}).`,
    );
  }
  return (payload as { ok: true; extraction: T }).extraction;
}

const fetchOverviewExtraction = (f: File) =>
  callTuevStep<TuevOverviewExtraction>(f, "overview", "Übersicht-Analyse");

const fetchHeaderExtraction = (f: File) =>
  callTuevStep<TuevHeaderExtraction>(f, "header", "Kopf-Analyse");

const fetchDefectsExtraction = (f: File) =>
  callTuevStep<TuevDefectsExtraction>(f, "defects", "Mängel-Analyse");

// ─── Merge extraction results → TuevReport ────────────────────────────────────

/**
 * Merge overview + header + defects extractions into a single TuevReport.
 * Precedence: header wins for core inspection fields; overview wins for
 * organization brand and fee (overview photo shows logo + bottom clearly).
 */
function buildTuevReport(
  overview: TuevOverviewExtraction | null,
  header: TuevHeaderExtraction,
  defects: TuevDefectsExtraction | null,
): TuevReport {
  // Organization: use overview brand if it's more specific than "other".
  const testingOrganization =
    overview && overview.testingOrganization !== "other"
      ? overview.testingOrganization
      : header.testingOrganization;

  return {
    testingOrganization,
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
  overview: TuevOverviewExtraction | null,
  header: TuevHeaderExtraction,
  defects: TuevDefectsExtraction | null,
): InvoiceTextParseResult {
  const org =
    overview && overview.testingOrganization !== "other"
      ? overview.testingOrganization
      : header.testingOrganization !== "other"
        ? header.testingOrganization
        : null;

  // Prefer overview for vendor + fee (full-doc photo shows these more reliably).
  const vendor = overview?.vendor ?? header.vendor;
  const amount = overview?.amount ?? header.amount;
  const lineItems = overview?.lineItems ?? header.lineItems;

  return normalizeTextParseResult({
    vendor,
    date: header.testDate,
    amount,
    category: "tuev",
    summary: "HU / AU Prüfbericht",
    lineItems,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: org,
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

// ─── Build upload file (all captured images → combined PDF) ───────────────────

/**
 * Combine all captured pages into a single PDF for Supabase storage.
 * Page order: overview → header → defects (matching wizard capture order).
 */
async function buildUploadFile(
  overviewFile: File | null,
  headerFile: File | null,
  defectsFile: File | null,
): Promise<File | null> {
  const pages = [overviewFile, headerFile, defectsFile].filter(
    (f): f is File => f !== null,
  );

  if (pages.length === 0) return null;
  if (pages.length === 1 && pages[0]!.type === "application/pdf") return pages[0]!;

  try {
    const result = await convertImagesToPdf(pages, {
      fileName: `tuev-scan-${Date.now()}`,
      fullBleed: true,
      imageCompression: "MEDIUM",
    });
    return result.file;
  } catch {
    // Fallback: first available file.
    return pages[0]!;
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
    overviewFile: null,
    headerFile: null,
    defectsFile: null,
    overviewExtraction: null,
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
      overviewFile: null,
      headerFile: null,
      defectsFile: null,
      overviewExtraction: null,
      headerExtraction: null,
      defectsExtraction: null,
      uploadFile: null,
      previewUrl: null,
      previewOwned: false,
      error: null,
    });
    setSaveError(null);
  }

  // ── Capture handlers (image collection only — no LLM calls) ─────────────────

  function handleOverviewCapture(file: File) {
    setState((prev) => ({
      ...prev,
      overviewFile: file,
      phase: "capture-header",
      error: null,
    }));
  }

  function handleHeaderCapture(file: File) {
    setState((prev) => ({
      ...prev,
      headerFile: file,
      phase: "capture-defects-prompt",
      error: null,
    }));
  }

  function handleDefectsCapture(file: File) {
    const { overviewFile, headerFile } = state;
    setState((prev) => ({
      ...prev,
      defectsFile: file,
      phase: "analyzing",
      error: null,
    }));
    void runAnalysis(overviewFile, headerFile, file);
  }

  function skipDefects() {
    const { overviewFile, headerFile } = state;
    setState((prev) => ({ ...prev, phase: "analyzing", error: null }));
    void runAnalysis(overviewFile, headerFile, null);
  }

  // ── Single analysis pass — all LLM calls in parallel ─────────────────────────

  async function runAnalysis(
    overviewFile: File | null,
    headerFile: File | null,
    defectsFile: File | null,
  ) {
    try {
      const [overviewResult, headerResult, defectsResult] = await Promise.all([
        overviewFile ? fetchOverviewExtraction(overviewFile) : Promise.resolve(null),
        headerFile ? fetchHeaderExtraction(headerFile) : Promise.resolve(null),
        defectsFile
          ? fetchDefectsExtraction(defectsFile).catch(
              (): TuevDefectsExtraction => ({
                defectsTable: null,
                defectsList: null,
              }),
            )
          : Promise.resolve(null),
      ]);

      if (!headerResult) {
        throw new TuevApiError("Kein Dokumentenkopf-Bild vorhanden.");
      }

      // Build the upload PDF and preview URL from the header photo.
      const uploadFile = await buildUploadFile(overviewFile, headerFile, defectsFile);
      const previewSource = headerFile ?? overviewFile;
      const owned = previewSource !== null && !previewSource.type.includes("pdf");
      const previewUrl = owned && previewSource
        ? URL.createObjectURL(previewSource)
        : null;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = previewUrl;

      setState((prev) => ({
        ...prev,
        phase: "review",
        overviewExtraction: overviewResult,
        headerExtraction: headerResult,
        defectsExtraction: defectsResult,
        uploadFile,
        previewUrl,
        previewOwned: owned,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: "capture-header",
        error:
          err instanceof Error
            ? err.message
            : "Analyse fehlgeschlagen. Bitte erneut versuchen.",
      }));
    }
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
      const pageCount = [state.overviewFile, state.headerFile, state.defectsFile]
        .filter(Boolean).length;
      formData.set("pageCount", String(pageCount || 1));
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

  const { phase, overviewExtraction, headerExtraction, defectsExtraction, error } = state;

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
            setState((prev) => ({ ...prev, phase: "capture-overview" }))
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
                In-Browser-Kamera · Schritt für Schritt · genauer
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium">
              3 Schritte
            </span>
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium">
              ~60 Sek.
            </span>
            <span className="rounded-lg bg-emerald-400/20 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-300">
              Genauer
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
  if (phase === "capture-overview") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Gesamten Bericht fotografieren"
          hint="Schritt 1 von 3 · Übersicht"
          guideFrame="a4"
          guideLabel="Gesamtes Blatt im DIN-A4-Rahmen ausrichten"
          allowPdf
          onCapture={handleOverviewCapture}
          onClose={() => setState((prev) => ({ ...prev, phase: "mode-select" }))}
        />
      </>
    );
  }

  if (phase === "capture-header") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Dokumentenkopf fotografieren"
          hint="Schritt 2 von 3 · Kopf-Abschnitt"
          guideFrame="section"
          guideSectionAnchor="top"
          guideLabel="Kopf mit KM-Stand, Datum und FIN"
          allowPdf
          onCapture={handleHeaderCapture}
          onClose={() => setState((prev) => ({ ...prev, phase: "capture-overview" }))}
        />
      </>
    );
  }

  if (phase === "capture-defects") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Mängel-Nachweis fotografieren"
          hint="Schritt 3 von 3 · Abschnitt 6"
          guideFrame="section"
          guideSectionAnchor="center"
          guideLabel="Punkt 6 — Festgestellte Mängel"
          onCapture={handleDefectsCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-defects-prompt" }))
          }
        />
      </>
    );
  }

  // ── Analyzing — full-screen loading while all LLM calls run ─────────────────

  if (phase === "analyzing") {
    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center gap-8 px-4 py-6 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-neutral-100 border-t-neutral-900" />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <ScanLine className="h-7 w-7 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[1rem] font-semibold text-[color:var(--vd-text)]">
            Alle Abschnitte werden analysiert…
          </p>
          <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
            KM-Stand · Ergebnis · nächste HU · Mängel · Prüfgebühr
          </p>
          <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
            Dauert etwa 15–30 Sekunden
          </p>
        </div>
        <div className="flex gap-2">
          {["Übersicht", "Kopf", "Mängel"].map((label, i) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"
            >
              <LoaderCircle className="h-3 w-3 animate-spin text-neutral-500" style={{ animationDelay: `${i * 300}ms` }} />
              <span className="text-[0.68rem] font-medium text-neutral-600">{label}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Page-shell views: progress bar covers the 3 capture steps.
  const captureStepMap: Partial<Record<WizardPhase, number>> = {
    "capture-overview": 1,
    "capture-header": 2,
    "capture-defects-prompt": 3,
    "capture-defects": 3,
  };
  const showCurrentStep = captureStepMap[phase] ?? 0;
  const showTotalSteps = 3;

  const isReview = phase === "review" && !!headerExtraction;

  if (isReview && state.uploadFile) {
    const mergedReport = buildTuevReport(overviewExtraction, headerExtraction!, defectsExtraction);
    const mergedFields = buildAnalyzeFields(overviewExtraction, headerExtraction!, defectsExtraction);
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
          previewUrl={state.previewUrl ?? ""}
          previewKind={isPdf ? "pdf" : "image"}
          pageCount={[state.overviewFile, state.headerFile, state.defectsFile].filter(Boolean).length || 1}
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
            {phase === "capture-defects-prompt"
              ? "Mängel vorhanden?"
              : "TÜV-Bericht scannen"}
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--vd-muted)]">
            {vehicleLabel}
          </p>
        </div>

        {/* Progress bar — only during capture phases */}
        {showCurrentStep > 0 ? (
          <WizardProgress
            currentStep={showCurrentStep}
            totalSteps={showTotalSteps}
          />
        ) : null}
      </header>

      {/* ── Defects prompt (Step 3/3) ─────────────────────────────── */}
      {phase === "capture-defects-prompt" ? (
        <div className="space-y-3">
          <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
            Hat der Bericht festgestellte Mängel? Falls ja, fotografiere jetzt
            Abschnitt&nbsp;6 — sonst weiter ohne Mängel-Scan.
          </p>

          <Button
            type="button"
            className="claim-cta w-full"
            onClick={() =>
              setState((prev) => ({ ...prev, phase: "capture-defects" }))
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
            Weiter — kein Mängel-Abschnitt
          </button>
        </div>
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
