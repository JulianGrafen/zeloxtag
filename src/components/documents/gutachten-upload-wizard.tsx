"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { AlertTriangle, ArrowRight, RotateCcw, ScanLine } from "lucide-react";

import {
  GutachtenOverview,
  fieldsToGutachtenReview,
} from "@/components/dashboard/GutachtenOverview";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import {
  WizardAnalyzingPanel,
  WizardCameraError,
  WizardScanHeader,
  WizardShell,
} from "@/components/documents/wizard-scan-shell";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import {
  gutachtenFollowUpSteps,
  gutachtenSubtypeBriefing,
  gutachtenTotalCaptureSteps,
  type GutachtenFollowUpStep,
} from "@/lib/documents/gutachten-scan-steps";
import { localDateIso } from "@/lib/documents/format";
import { uploadDocument } from "@/lib/documents/upload-document";
import {
  analyzeDocumentFiles,
  AnalyzeDocumentError,
  type AnalyzeDocumentResult,
} from "@/lib/ocr/analyze-document-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  GUTACHTEN_SUBTYPE_LABELS,
  gutachtenToAnalyzeFields,
  gutachtenToApprovalFields,
  type GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import { Button } from "@/components/ui/button";

type WizardPhase =
  | "capture-primary"
  | "analyzing"
  | "briefing"
  | "capture-followup"
  | "review";

interface WizardState {
  phase: WizardPhase;
  primaryFile: File | null;
  additionalFiles: File[];
  followUpIndex: number;
  uploadFile: File | null;
  previewUrl: string | null;
  previewKind: "pdf" | "image";
  fields: InvoiceTextParseResult | null;
  approvalFields: ApprovalFields | null;
  extraction: GutachtenExtraction | null;
  error: string | null;
}

export interface GutachtenUploadWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function extractionFromAnalyzeResult(
  result: AnalyzeDocumentResult,
): GutachtenExtraction {
  if (result.approvalFields?.kind === "gutachten") {
    return result.approvalFields.data;
  }
  return fieldsToGutachtenReview(result.fields, result.approvalFields);
}

function AnalyzingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-neutral-950/90 px-6 text-center text-white backdrop-blur-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
        <ScanLine className="h-7 w-7 animate-pulse" />
      </div>
      <p className="text-[1rem] font-semibold">{label}</p>
      <p className="max-w-sm text-[0.85rem] text-white/75">
        Dokumenttyp wird erkannt — gleich geht es mit der passenden Anleitung
        weiter.
      </p>
    </div>
  );
}

export function GutachtenUploadWizard({
  vehicleId,
  vehicleLabel,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: GutachtenUploadWizardProps) {
  const previewUrlRef = useRef<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [state, setState] = useState<WizardState>({
    phase: "capture-primary",
    primaryFile: null,
    additionalFiles: [],
    followUpIndex: 0,
    uploadFile: null,
    previewUrl: null,
    previewKind: "image",
    fields: null,
    approvalFields: null,
    extraction: null,
    error: null,
  });

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const followUpSteps = useMemo(
    () =>
      state.extraction
        ? gutachtenFollowUpSteps(state.extraction.documentSubtype)
        : [],
    [state.extraction],
  );

  const totalSteps = state.extraction
    ? gutachtenTotalCaptureSteps(state.extraction.documentSubtype)
    : 1;

  const currentFollowUpStep: GutachtenFollowUpStep | null =
    state.phase === "capture-followup"
      ? (followUpSteps[state.followUpIndex] ?? null)
      : null;

  function resetToStart() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setSaveError(null);
    setState({
      phase: "capture-primary",
      primaryFile: null,
      additionalFiles: [],
      followUpIndex: 0,
      uploadFile: null,
      previewUrl: null,
      previewKind: "image",
      fields: null,
      approvalFields: null,
      extraction: null,
      error: null,
    });
  }

  function advanceAfterPrimaryAnalysis(
    file: File,
    result: AnalyzeDocumentResult,
    extraction: GutachtenExtraction,
  ) {
    const steps = gutachtenFollowUpSteps(extraction.documentSubtype);
    if (steps.length === 0) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;

      setState((prev) => ({
        ...prev,
        phase: "review",
        primaryFile: file,
        additionalFiles: [],
        followUpIndex: 0,
        uploadFile: file,
        previewUrl,
        previewKind: isPdfFile(file) ? "pdf" : "image",
        fields: result.fields,
        approvalFields: result.approvalFields,
        extraction,
        error: null,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      phase: "capture-followup",
      primaryFile: file,
      additionalFiles: [],
      followUpIndex: 0,
      fields: result.fields,
      approvalFields: result.approvalFields,
      extraction,
      error: null,
    }));
  }

  async function runPrimaryAnalysis(file: File) {
    setState((prev) => ({
      ...prev,
      phase: "analyzing",
      error: null,
    }));

    try {
      const result = await analyzeDocumentFiles([file], undefined, {
        documentType: "abe",
        approvalKind: "gutachten",
        vehicleId,
      });

      const extraction = extractionFromAnalyzeResult(result);
      advanceAfterPrimaryAnalysis(file, result, extraction);
    } catch (error) {
      const message =
        error instanceof AnalyzeDocumentError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Analyse fehlgeschlagen.";

      setState((prev) => ({
        ...prev,
        phase: "capture-primary",
        error: message,
      }));
    }
  }

  function startFollowUpCapture() {
    setState((prev) => ({
      ...prev,
      phase: "capture-followup",
      error: null,
    }));
  }

  function advanceFollowUp(file: File) {
    setState((prev) => {
      if (!prev.extraction || !prev.primaryFile || !prev.fields) return prev;

      const steps = gutachtenFollowUpSteps(prev.extraction.documentSubtype);
      const additionalFiles = [...prev.additionalFiles, file];
      const nextIndex = prev.followUpIndex + 1;

      if (nextIndex >= steps.length) {
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        const previewUrl = URL.createObjectURL(prev.primaryFile);
        previewUrlRef.current = previewUrl;

        return {
          ...prev,
          phase: "review",
          additionalFiles,
          uploadFile: prev.primaryFile,
          previewUrl,
          previewKind: isPdfFile(prev.primaryFile) ? "pdf" : "image",
          error: null,
        };
      }

      return {
        ...prev,
        additionalFiles,
        followUpIndex: nextIndex,
        phase: "capture-followup",
        error: null,
      };
    });
  }

  function skipCurrentFollowUp() {
    setState((prev) => {
      if (!prev.extraction || !prev.primaryFile || !prev.fields) return prev;

      const steps = gutachtenFollowUpSteps(prev.extraction.documentSubtype);
      const nextIndex = prev.followUpIndex + 1;

      if (nextIndex >= steps.length) {
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        const previewUrl = URL.createObjectURL(prev.primaryFile);
        previewUrlRef.current = previewUrl;

        return {
          ...prev,
          phase: "review",
          uploadFile: prev.primaryFile,
          previewUrl,
          previewKind: isPdfFile(prev.primaryFile) ? "pdf" : "image",
          error: null,
        };
      }

      return {
        ...prev,
        followUpIndex: nextIndex,
        phase: "capture-followup",
        error: null,
      };
    });
  }

  async function buildUploadFile(
    primary: File,
    additional: File[],
  ): Promise<File> {
    const sources = [primary, ...additional];
    if (sources.length === 1 && isPdfFile(primary)) return primary;
    const pdf = await convertImagesToPdf(sources, {
      fileName: `gutachten-${Date.now()}`,
    });
    return pdf.file;
  }

  function handleSave(payload: {
    review: GutachtenExtraction;
    approvalFields: Extract<ApprovalFields, { kind: "gutachten" }>;
    title: string;
  }) {
    if (!state.primaryFile) return;

    startSave(async () => {
      setSaveError(null);
      const uploadFile = await buildUploadFile(
        state.primaryFile!,
        state.additionalFiles,
      );
      const fields = gutachtenToAnalyzeFields(payload.review);

      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("title", payload.title);
      formData.set("type", "abe");
      formData.set("date", payload.review.issueDate ?? localDateIso());
      formData.set(
        "approvalFields",
        JSON.stringify(gutachtenToApprovalFields(payload.review)),
      );
      formData.set("kbaNumber", payload.review.certificateNumber ?? "");
      formData.set("manufacturer", payload.review.manufacturer ?? "");
      formData.set("partCategory", payload.review.partName);
      formData.set("authority", payload.review.testOrganization ?? "");
      formData.set("notes", payload.review.vehicleMatchNotes ?? "");
      formData.set("summary", fields.summary ?? payload.title);
      formData.set("file", uploadFile);

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

  const { phase, error, extraction } = state;

  if (phase === "analyzing") {
    return <AnalyzingOverlay label="Gutachten wird analysiert…" />;
  }

  if (phase === "capture-primary") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Gutachten · Titelseite"
          hint="Ganzes Dokument im DIN-A4-Rahmen — danach erkennt die KI den Dokumenttyp"
          captureStep={{ current: 1, total: totalSteps }}
          guideFrame="a4"
          guideFrameDimOutside
          guideLabel="Gutachten / Prüfbericht"
          allowPdf
          onCapture={(file) => void runPrimaryAnalysis(file)}
          onClose={onBack ?? resetToStart}
        />
      </>
    );
  }

  if (phase === "briefing" && extraction) {
    const briefing = gutachtenSubtypeBriefing(
      extraction.documentSubtype,
      extraction.partName,
    );
    const nextStep = followUpSteps[0];

    return (
      <WizardShell>
        <WizardScanHeader
          eyebrow="Gutachten · Erkannt"
          title={briefing.headline}
          vehicleLabel={vehicleLabel}
          currentStep={2}
          totalSteps={totalSteps}
          onBack={resetToStart}
          backLabel="Neu scannen"
        />
        <div className="space-y-4">
          <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
            {briefing.body}
          </p>
          {nextStep ? (
            <div className="rounded-[1.25rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Nächster Scan
              </p>
              <p className="mt-2 text-[1rem] font-semibold text-[color:var(--vd-text)]">
                {nextStep.title}
              </p>
              <p className="mt-1 text-[0.82rem] text-[color:var(--vd-muted)]">
                {nextStep.hint}
              </p>
            </div>
          ) : null}
          <Button
            type="button"
            className="claim-cta w-full"
            onClick={startFollowUpCapture}
          >
            <ScanLine className="h-4 w-4" />
            Weiter — {nextStep?.title ?? "Review"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </WizardShell>
    );
  }

  if (phase === "capture-followup" && currentFollowUpStep && extraction) {
    const stepNumber = 2 + state.followUpIndex;
    const subtypeBriefing = gutachtenSubtypeBriefing(
      extraction.documentSubtype,
      extraction.partName,
    );
    const isFirstFollowUp = state.followUpIndex === 0;
    const followUpHint = isFirstFollowUp
      ? `${subtypeBriefing.headline}. ${currentFollowUpStep.hint}`
      : currentFollowUpStep.hint;

    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          key={`${extraction.documentSubtype}-${currentFollowUpStep.id}-${state.followUpIndex}`}
          title={currentFollowUpStep.title}
          hint={followUpHint}
          captureStep={{ current: stepNumber, total: totalSteps }}
          guideFrame={currentFollowUpStep.guideFrame}
          guideFrameDimOutside={currentFollowUpStep.guideFrameDimOutside}
          guideSectionAnchor={currentFollowUpStep.guideSectionAnchor}
          guideLabel={currentFollowUpStep.guideLabel}
          a4AutoCrop={currentFollowUpStep.a4AutoCrop}
          enforceCaptureQuality={currentFollowUpStep.enforceCaptureQuality}
          showBriefing={isFirstFollowUp}
          allowPdf
          onCapture={(file) => advanceFollowUp(file)}
          onClose={() =>
            setState((prev) => ({
              ...prev,
              phase:
                prev.followUpIndex === 0 ? "briefing" : "capture-followup",
              followUpIndex: Math.max(0, prev.followUpIndex - 1),
            }))
          }
        />
        {currentFollowUpStep.skippable ? (
          <button
            type="button"
            onClick={skipCurrentFollowUp}
            className="fixed bottom-[max(6.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-[0.78rem] font-medium text-white backdrop-blur-md"
          >
            {currentFollowUpStep.skipLabel ?? "Überspringen"}
          </button>
        ) : null}
      </>
    );
  }

  if (
    phase === "review" &&
    state.primaryFile &&
    state.previewUrl &&
    state.fields &&
    extraction
  ) {
    return (
      <WizardShell>
        <WizardScanHeader
          eyebrow={`Gutachten · ${GUTACHTEN_SUBTYPE_LABELS[extraction.documentSubtype]}`}
          title="Daten prüfen"
          vehicleLabel={vehicleLabel}
          currentStep={totalSteps}
          totalSteps={totalSteps}
          onBack={resetToStart}
          backLabel="Neu scannen"
        />
        {state.additionalFiles.length > 0 ? (
          <p className="mb-3 text-[0.78rem] text-[color:var(--vd-muted)]">
            {1 + state.additionalFiles.length} Scan(s) werden als ein PDF
            gespeichert.
          </p>
        ) : null}
        <GutachtenOverview
          previewUrl={state.previewUrl}
          previewKind={state.previewKind}
          pageCount={1 + state.additionalFiles.length}
          fields={state.fields}
          approvalFields={state.approvalFields}
          isSaving={saving}
          saveError={saveError}
          onCancel={resetToStart}
          onSave={handleSave}
        />
      </WizardShell>
    );
  }

  return (
    <WizardShell>
      <WizardScanHeader
        eyebrow="Gutachten / Prüfbericht"
        title="Gutachten scannen"
        vehicleLabel={vehicleLabel}
        onBack={onBack}
        backHref={backHref}
        backLabel={backLabel}
      />
      <WizardAnalyzingPanel label="Wizard wird vorbereitet…" />
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-800">
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
          {error}
          <button
            type="button"
            onClick={resetToStart}
            className="mt-2 flex items-center gap-1.5 text-[0.78rem] font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Erneut versuchen
          </button>
        </div>
      ) : null}
    </WizardShell>
  );
}
