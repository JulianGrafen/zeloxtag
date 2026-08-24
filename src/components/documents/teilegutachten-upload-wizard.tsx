"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  SkipForward,
} from "lucide-react";

import {
  TeilegutachtenOverview,
  type TeilegutachtenReviewFields,
} from "@/components/dashboard/TeilegutachtenOverview";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { Button } from "@/components/ui/button";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { localDateIso, normalizeDocumentDateIso } from "@/lib/documents/format";
import { uploadDocument } from "@/lib/documents/upload-document";
import {
  analyzeDocumentFiles,
  AnalyzeDocumentError,
} from "@/lib/ocr/analyze-document-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import { technicalSpecsFromTeilegutachtenTable } from "@/lib/validations/teilegutachten-technical-data";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardPhase =
  | "capture-cover"
  | "capture-verwendungsbereich"
  | "capture-auflagen"
  | "capture-technical-prompt"
  | "capture-technical"
  | "analyzing"
  | "review";

interface WizardState {
  phase: WizardPhase;
  coverFile: File | null;
  verwendungsbereichFile: File | null;
  auflagenFile: File | null;
  technicalFile: File | null;
  uploadFile: File | null;
  previewUrl: string | null;
  previewKind: "pdf" | "image";
  previewOwned: boolean;
  fields: InvoiceTextParseResult | null;
  approvalFields: ApprovalFields | null;
  error: string | null;
}

export interface TeilegutachtenUploadWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  vehicleContext?: AbeVehicleContext | null;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

const TOTAL_STEPS = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function buildUploadPdf(files: File[]): Promise<File> {
  const pages = files.filter(Boolean);
  if (pages.length === 0) {
    throw new Error("Keine Aufnahmen vorhanden.");
  }
  if (pages.length === 1 && isPdfFile(pages[0]!)) {
    return pages[0]!;
  }

  const result = await convertImagesToPdf(pages, {
    fileName: `teilegutachten-scan-${Date.now()}`,
    fullBleed: true,
    imageCompression: "MEDIUM",
  });
  return result.file;
}

function WizardProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Schritt ${currentStep} von ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={[
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            index < currentStep
              ? "bg-neutral-900"
              : index === currentStep - 1
                ? "bg-neutral-700"
                : "bg-neutral-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function AnalyzingOverlay() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
        <LoaderCircle className="h-7 w-7 animate-spin text-white" />
      </div>
      <div>
        <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
          Teilegutachten wird analysiert…
        </p>
        <p className="mt-1 text-[0.8rem] text-[color:var(--vd-muted)]">
          Gutachtennummer, Verwendungsbereich und Auflagen werden ausgelesen.
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Guided Teilegutachten upload — section-by-section capture, then one OCR pass.
 *
 * Steps: Deckblatt → Verwendungsbereich → Auflagen → Technische Daten (optional).
 */
export function TeilegutachtenUploadWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  vehicleContext,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: TeilegutachtenUploadWizardProps) {
  const previewUrlRef = useRef<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [state, setState] = useState<WizardState>({
    phase: "capture-cover",
    coverFile: null,
    verwendungsbereichFile: null,
    auflagenFile: null,
    technicalFile: null,
    uploadFile: null,
    previewUrl: null,
    previewKind: "image",
    previewOwned: false,
    fields: null,
    approvalFields: null,
    error: null,
  });

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const pageCount = [
    state.coverFile,
    state.verwendungsbereichFile,
    state.auflagenFile,
    state.technicalFile,
  ].filter(Boolean).length;

  function resetToStart() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setState({
      phase: "capture-cover",
      coverFile: null,
      verwendungsbereichFile: null,
      auflagenFile: null,
      technicalFile: null,
      uploadFile: null,
      previewUrl: null,
      previewKind: "image",
      previewOwned: false,
      fields: null,
      approvalFields: null,
      error: null,
    });
    setSaveError(null);
  }

  async function runAnalysis(
    coverFile: File,
    verwendungsbereichFile: File,
    auflagenFile: File,
    technicalFile: File | null,
  ) {
    try {
      const ordered = [
        coverFile,
        verwendungsbereichFile,
        auflagenFile,
        technicalFile,
      ].filter((file): file is File => file !== null);

      const uploadFile = await buildUploadPdf(ordered);
      const analyzed = await analyzeDocumentFiles([uploadFile], undefined, {
        vehicleId,
        documentType: "abe",
        approvalKind: "teilegutachten",
        vehicleContext: vehicleContext ?? null,
      });

      const previewSource = coverFile ?? uploadFile;
      let previewUrl: string | null = null;
      let previewKind: "pdf" | "image" = "image";
      let previewOwned = false;

      if (previewSource) {
        previewUrl = URL.createObjectURL(previewSource);
        previewKind = isPdfFile(previewSource) ? "pdf" : "image";
        previewOwned = true;
      } else if (isPdfFile(uploadFile)) {
        previewUrl = URL.createObjectURL(uploadFile);
        previewKind = "pdf";
        previewOwned = true;
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = previewOwned ? previewUrl : null;

      setState((prev) => ({
        ...prev,
        phase: "review",
        uploadFile,
        previewUrl,
        previewKind,
        previewOwned,
        fields: analyzed.fields,
        approvalFields: analyzed.approvalFields,
        error: null,
      }));
    } catch (err) {
      const message =
        err instanceof AnalyzeDocumentError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Analyse fehlgeschlagen. Bitte erneut versuchen.";

      setState((prev) => ({
        ...prev,
        phase: "capture-cover",
        error: message,
      }));
    }
  }

  function startAnalysis(
    coverFile: File,
    verwendungsbereichFile: File,
    auflagenFile: File,
    technicalFile: File | null,
  ) {
    setState((prev) => ({ ...prev, phase: "analyzing", error: null }));
    void runAnalysis(coverFile, verwendungsbereichFile, auflagenFile, technicalFile);
  }

  function handleCoverCapture(file: File) {
    setState((prev) => ({
      ...prev,
      coverFile: file,
      phase: "capture-verwendungsbereich",
      error: null,
    }));
  }

  function handleVerwendungsbereichCapture(file: File) {
    setState((prev) => ({
      ...prev,
      verwendungsbereichFile: file,
      phase: "capture-auflagen",
      error: null,
    }));
  }

  function handleAuflagenCapture(file: File) {
    const { coverFile, verwendungsbereichFile } = state;
    if (!coverFile || !verwendungsbereichFile) return;

    setState((prev) => ({
      ...prev,
      auflagenFile: file,
      phase: "capture-technical-prompt",
      error: null,
    }));
  }

  function handleTechnicalCapture(file: File) {
    const { coverFile, verwendungsbereichFile, auflagenFile } = state;
    if (!coverFile || !verwendungsbereichFile || !auflagenFile) return;

    setState((prev) => ({ ...prev, technicalFile: file, error: null }));
    startAnalysis(coverFile, verwendungsbereichFile, auflagenFile, file);
  }

  function skipTechnical() {
    const { coverFile, verwendungsbereichFile, auflagenFile } = state;
    if (!coverFile || !verwendungsbereichFile || !auflagenFile) return;
    startAnalysis(coverFile, verwendungsbereichFile, auflagenFile, null);
  }

  function handleSave(payload: {
    review: TeilegutachtenReviewFields;
    approvalFields: Extract<ApprovalFields, { kind: "teilegutachten" }>;
    title: string;
  }) {
    if (!state.uploadFile) {
      setSaveError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    setSaveError(null);
    const { review, approvalFields: approval, title: storedTitle } = payload;
    const certificateNumber = review.certificateNumber?.trim() ?? "";

    const notes = [
      review.userVehicleMatchStatus
        ? `Fahrzeug-Check: ${review.userVehicleMatchStatus}`
        : null,
      review.matchedVehicleRow
        ? `Trefferzeile: ${review.matchedVehicleRow}`
        : null,
      review.markingType
        ? `Art der Kennzeichnung: ${review.markingType}`
        : review.physicalMarking
          ? `Kennzeichnung: ${review.physicalMarking}`
          : null,
      review.markingNumber
        ? `Kennzeichnungsnummer: ${review.markingNumber}`
        : null,
      "Hinweis: Teilegutachten allein nicht straßenverkehrsrechtlich gültig — Anbauabnahme erforderlich.",
    ]
      .filter(Boolean)
      .join("\n");

    startSave(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
      formData.set("type", "abe");
      formData.set("category", "abe");
      formData.set("vendor", review.partType?.trim() ?? storedTitle);
      formData.set("date", normalizeDocumentDateIso(review.issueDate) ?? localDateIso());
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", certificateNumber);
      formData.set(
        "vehicleApprovals",
        review.vehicleApprovals?.length
          ? JSON.stringify(review.vehicleApprovals)
          : review.matchedVehicleRow
            ? JSON.stringify([review.matchedVehicleRow])
            : "",
      );
      formData.set("authority", review.testingOrganization?.trim() ?? "");
      formData.set(
        "conditions",
        review.auflagen?.length ? JSON.stringify(review.auflagen) : "",
      );
      const technicalSpecs = technicalSpecsFromTeilegutachtenTable(
        approval.data.technicalDataTable,
      );
      formData.set(
        "technicalSpecs",
        technicalSpecs?.length ? JSON.stringify(technicalSpecs) : "",
      );
      formData.set(
        "partCategory",
        review.modificationType?.trim() ?? review.partCategory?.trim() ?? "",
      );
      formData.set("notes", notes);
      formData.set("manufacturer", review.manufacturer?.trim() ?? "");
      formData.set("invoiceNumber", certificateNumber);
      formData.set("mileageKm", "");
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

  const { phase, error } = state;

  const captureStepMap: Partial<Record<WizardPhase, number>> = {
    "capture-cover": 1,
    "capture-verwendungsbereich": 2,
    "capture-auflagen": 3,
    "capture-technical-prompt": 4,
    "capture-technical": 4,
  };
  const showCurrentStep = captureStepMap[phase] ?? 0;

  // ── Camera views (full-screen) ─────────────────────────────────────────────

  if (phase === "capture-cover") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Deckblatt fotografieren"
          hint="Gutachtennummer, Kennzeichnung, Hersteller"
          captureStep={{ current: 1, total: TOTAL_STEPS }}
          guideFrame="a4"
          guideSectionAnchor="top"
          guideLabel="Deckblatt mit Gutachtennummer & Kennzeichnung"
          allowPdf
          onCapture={handleCoverCapture}
          onClose={onBack ?? resetToStart}
        />
      </>
    );
  }

  if (phase === "capture-verwendungsbereich") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Verwendungsbereich fotografieren"
          hint="Komplette Fahrzeug-Tabelle erfassen"
          captureStep={{ current: 2, total: TOTAL_STEPS }}
          guideFrame="table"
          guideLabel="Verwendungsbereich — alle Spalten & Zeilen"
          allowPdf
          onCapture={handleVerwendungsbereichCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-cover" }))
          }
        />
      </>
    );
  }

  if (phase === "capture-auflagen") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Auflagen fotografieren"
          hint="Abschnitt IV — Hinweise und Auflagen"
          captureStep={{ current: 3, total: TOTAL_STEPS }}
          guideFrame="section"
          guideSectionAnchor="top"
          guideLabel="Auflagen / Abschnitt IV"
          allowPdf
          onCapture={handleAuflagenCapture}
          onClose={() =>
            setState((prev) => ({
              ...prev,
              phase: "capture-verwendungsbereich",
            }))
          }
        />
      </>
    );
  }

  if (phase === "capture-technical") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Technische Daten fotografieren"
          hint="Abschnitt II und ggf. Hinweise für den Halter"
          captureStep={{ current: 4, total: TOTAL_STEPS }}
          guideFrame="section"
          guideSectionAnchor="top"
          guideLabel="Technische Daten / Hinweise Halter"
          allowPdf
          onCapture={handleTechnicalCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-technical-prompt" }))
          }
        />
      </>
    );
  }

  // ── Review ─────────────────────────────────────────────────────────────────

  if (
    phase === "review" &&
    state.uploadFile &&
    state.previewUrl &&
    state.fields
  ) {
    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-6 px-4 py-6">
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.82rem] text-amber-900">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
            {error}
          </div>
        ) : null}
        <TeilegutachtenOverview
          previewUrl={state.previewUrl}
          previewKind={state.previewKind}
          pageCount={pageCount}
          fields={state.fields}
          approvalFields={state.approvalFields}
          isSaving={saving}
          saveError={saveError}
          onCancel={resetToStart}
          onSave={handleSave}
        />
      </section>
    );
  }

  // ── Page shell (prompt, analyzing) ─────────────────────────────────────────

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-0 px-4 py-6">
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

        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <ScanLine className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Teilegutachten · § 19 Abs. 3
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            {phase === "capture-technical-prompt"
              ? "Weitere Seiten?"
              : "Teilegutachten scannen"}
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--vd-muted)]">
            {vehicleLabel}
          </p>
        </div>

        {showCurrentStep > 0 ? (
          <WizardProgress currentStep={showCurrentStep} totalSteps={TOTAL_STEPS} />
        ) : null}
      </header>

      {phase === "analyzing" ? <AnalyzingOverlay /> : null}

      {phase === "capture-technical-prompt" ? (
        <div className="space-y-3">
          <p className="text-center text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            Liegen Technische Daten (Abschnitt&nbsp;II) oder Hinweise für den
            Halter auf separaten Seiten? Falls ja, jetzt fotografieren — sonst
            direkt zur Analyse.
          </p>

          <Button
            type="button"
            className="claim-cta w-full"
            onClick={() =>
              setState((prev) => ({ ...prev, phase: "capture-technical" }))
            }
          >
            <ScanLine className="h-4 w-4" />
            Technische Daten fotografieren
            <ArrowRight className="h-4 w-4" />
          </Button>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[0.82rem] text-[color:var(--vd-muted)] transition-opacity active:opacity-60"
            onClick={skipTechnical}
          >
            <SkipForward className="h-3.5 w-3.5" />
            Weiter — keine weiteren Seiten
          </button>
        </div>
      ) : null}

      {error && phase !== "analyzing" ? (
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
