"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { AlertTriangle, RotateCcw, ScanLine } from "lucide-react";

import { GutachtenOverview } from "@/components/dashboard/GutachtenOverview";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import {
  WizardAnalyzingPanel,
  WizardCameraError,
  WizardScanHeader,
  WizardShell,
} from "@/components/documents/wizard-scan-shell";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { localDateIso } from "@/lib/documents/format";
import { uploadDocument } from "@/lib/documents/upload-document";
import {
  analyzeDocumentFiles,
  AnalyzeDocumentError,
} from "@/lib/ocr/analyze-document-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  gutachtenToAnalyzeFields,
  gutachtenToApprovalFields,
  type GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import { Button } from "@/components/ui/button";

type WizardPhase = "capture" | "analyzing" | "review";

interface WizardState {
  phase: WizardPhase;
  uploadFile: File | null;
  previewUrl: string | null;
  previewKind: "pdf" | "image";
  previewOwned: boolean;
  fields: InvoiceTextParseResult | null;
  approvalFields: ApprovalFields | null;
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

export function GutachtenUploadWizard({
  vehicleId,
  tagUuid,
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
    phase: "capture",
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
        previewUrlRef.current = null;
      }
    };
  }, []);

  function resetToStart() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setSaveError(null);
    setState({
      phase: "capture",
      uploadFile: null,
      previewUrl: null,
      previewKind: "image",
      previewOwned: false,
      fields: null,
      approvalFields: null,
      error: null,
    });
  }

  async function runAnalysis(file: File) {
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

      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;

      setState((prev) => ({
        ...prev,
        phase: "review",
        uploadFile: file,
        previewUrl,
        previewKind: isPdfFile(file) ? "pdf" : "image",
        previewOwned: true,
        fields: result.fields,
        approvalFields: result.approvalFields,
        error: null,
      }));
    } catch (error) {
      const message =
        error instanceof AnalyzeDocumentError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Analyse fehlgeschlagen.";

      setState((prev) => ({
        ...prev,
        phase: "capture",
        error: message,
      }));
    }
  }

  async function handleCapture(file: File) {
    await runAnalysis(file);
  }

  async function handlePdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await runAnalysis(file);
  }

  async function buildUploadFile(
    source: File,
    review: GutachtenExtraction,
  ): Promise<File> {
    if (isPdfFile(source)) return source;
    const pdf = await convertImagesToPdf([source], {
      fileName: `gutachten-${Date.now()}`,
    });
    return pdf.file;
  }

  function handleSave(payload: {
    review: GutachtenExtraction;
    approvalFields: Extract<ApprovalFields, { kind: "gutachten" }>;
    title: string;
  }) {
    if (!state.uploadFile) return;

    startSave(async () => {
      setSaveError(null);
      const uploadFile = await buildUploadFile(state.uploadFile!, payload.review);
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

  const { phase, error } = state;

  if (phase === "capture") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Gutachten fotografieren"
          hint="Teilegutachten, Einzelabnahme §21 oder Anbauabnahme — ganzes Dokument im DIN-A4-Rahmen"
          guideFrame="a4"
          guideFrameDimOutside
          guideLabel="Gutachten / Prüfbericht"
          allowPdf
          onCapture={handleCapture}
          onClose={onBack ?? resetToStart}
        />
      </>
    );
  }

  if (
    phase === "review" &&
    state.uploadFile &&
    state.previewUrl &&
    state.fields
  ) {
    return (
      <WizardShell>
        <WizardScanHeader
          eyebrow="Gutachten · Smart Review"
          title="Daten prüfen"
          vehicleLabel={vehicleLabel}
          onBack={resetToStart}
          backLabel="Erneut scannen"
        />
        <GutachtenOverview
          previewUrl={state.previewUrl}
          previewKind={state.previewKind}
          pageCount={1}
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

      {phase === "analyzing" ? (
        <WizardAnalyzingPanel
          label="Gutachten wird analysiert…"
          subtitle="Dokumenttyp, Bauteil, Nummer und Prüforganisation werden erkannt."
        />
      ) : (
        <div className="space-y-4">
          <p className="text-center text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
            Fotografiere das Gutachten oder lade ein PDF hoch. Die KI erkennt
            automatisch Teilegutachten, Einzelabnahme oder Anbauabnahme.
          </p>
          <Button
            type="button"
            className="claim-cta w-full"
            onClick={() => setState((prev) => ({ ...prev, phase: "capture" }))}
          >
            <ScanLine className="h-4 w-4" />
            Kamera öffnen
          </Button>
          <label className="claim-back relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border px-4 py-3 text-[0.88rem] font-medium">
            <input
              type="file"
              accept="application/pdf,.pdf,image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(event) => void handlePdfSelected(event)}
            />
            PDF / Bild hochladen
          </label>
        </div>
      )}

      {error && phase !== "analyzing" ? (
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
