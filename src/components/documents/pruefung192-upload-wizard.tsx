"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  AlertTriangle,
  RotateCcw,
  SkipForward,
} from "lucide-react";

import {
  Pruefung192Overview,
  fieldsToPruefung192Review,
} from "@/components/dashboard/Pruefung192Overview";
import { ImageCropOverlay } from "@/components/documents/image-crop-capture";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import {
  WizardAnalyzingPanel,
  WizardCameraError,
  WizardScanHeader,
  WizardShell,
} from "@/components/documents/wizard-scan-shell";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { localDateIso, normalizeDocumentDateIso } from "@/lib/documents/format";
import { isActionFailure, uploadDocument } from "@/lib/documents/upload-document";
import {
  analyzeDocumentFiles,
  AnalyzeDocumentError,
  type AnalyzeDocumentResult,
} from "@/lib/ocr/analyze-document-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  inferTestingOrganizationLabel,
  mergeParagraph192Extractions,
  paragraph192ToAnalyzeFields,
  paragraph192ToApprovalFields,
  type Paragraph192Extraction,
} from "@/lib/validations/paragraph192Schema";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import {
  convertImagesToPdf,
  normalizePageForPdfMerge,
} from "@/lib/utils/pdf-converter";

type WizardPhase =
  | "capture-bericht"
  | "analyzing-bericht"
  | "capture-gutachten"
  | "crop-gutachten"
  | "analyzing-gutachten"
  | "capture-vorschriften"
  | "capture-vorschriften-2"
  | "analyzing"
  | "review";

interface WizardState {
  phase: WizardPhase;
  berichtFile: File | null;
  gutachtenFullFile: File | null;
  gutachtenTableFile: File | null;
  gutachtenCropSourceUrl: string | null;
  vorschriftenFile: File | null;
  vorschriften2File: File | null;
  draftExtraction: Paragraph192Extraction | null;
  uploadFile: File | null;
  storedPageCount: number;
  previewUrl: string | null;
  previewKind: "pdf" | "image";
  previewOwned: boolean;
  fields: InvoiceTextParseResult | null;
  approvalFields: ApprovalFields | null;
  error: string | null;
}

export interface Pruefung192UploadWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  vehicleContext?: AbeVehicleContext | null;
  garageVin?: string | null;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

const TOTAL_STEPS = 4;

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function buildUploadPdf(
  files: File[],
): Promise<{ file: File; pageCount: number }> {
  const pages = files.filter(Boolean);
  if (pages.length === 0) {
    throw new Error("Keine Aufnahmen vorhanden.");
  }
  if (pages.length === 1 && isPdfFile(pages[0]!)) {
    return { file: pages[0]!, pageCount: 1 };
  }
  const sources = await Promise.all(pages.map(normalizePageForPdfMerge));
  const result = await convertImagesToPdf(sources, {
    fileName: `pruefung192-scan-${Date.now()}`,
    fullBleed: true,
    imageCompression: "MEDIUM",
  });
  return { file: result.file, pageCount: result.pageCount };
}

function extractionFromAnalyze(
  result: AnalyzeDocumentResult,
  zbTablePreserved = false,
): Paragraph192Extraction | null {
  if (result.approvalFields?.kind !== "pruefung192") return null;
  const approval = result.approvalFields.data;
  const vin =
    result.fields.vehicleApprovals?.[0]?.replace(/^VIN\s+/i, "").trim() ??
    "UNKNOWN";

  return {
    reportNumber: approval.reportNumber,
    inspectionDate: result.fields.date,
    vin,
    licensePlate: null,
    manufacturer: result.fields.manufacturer,
    vehicleType: result.fields.vendor,
    variant: null,
    ownerName: null,
    testingOrganization: result.fields.authority,
    inspectionLocation: null,
    inspectionResult: approval.inspectionResult ?? null,
    mileageKm: result.fields.mileageKm,
    firstRegistration: null,
    lastHu: null,
    officialExpert: approval.officialExpert,
    field22Text: approval.field22Text,
    assessedModifications: approval.assessedModifications ?? null,
    typeApprovalBase: null,
    zbTablePreserved: zbTablePreserved || (approval.zbTablePreserved ?? false),
  };
}

function applyExtractionToAnalyze(
  extracted: Paragraph192Extraction,
  vinMatched: boolean | null,
): AnalyzeDocumentResult {
  return {
    kind: "abe",
    documentType: "abe",
    fields: paragraph192ToAnalyzeFields(extracted, vinMatched),
    approvalFields: paragraph192ToApprovalFields(extracted),
    rawText: "",
    modelId: "wizard-merge",
  };
}

export function Pruefung192UploadWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  vehicleContext,
  garageVin,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: Pruefung192UploadWizardProps) {
  const previewUrlRef = useRef<string | null>(null);
  const gutachtenCropUrlRef = useRef<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [state, setState] = useState<WizardState>({
    phase: "capture-bericht",
    berichtFile: null,
    gutachtenFullFile: null,
    gutachtenTableFile: null,
    gutachtenCropSourceUrl: null,
    vorschriftenFile: null,
    vorschriften2File: null,
    draftExtraction: null,
    uploadFile: null,
    storedPageCount: 0,
    previewUrl: null,
    previewKind: "pdf",
    previewOwned: false,
    fields: null,
    approvalFields: null,
    error: null,
  });

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (gutachtenCropUrlRef.current) {
        URL.revokeObjectURL(gutachtenCropUrlRef.current);
      }
    };
  }, []);

  const pageCount =
    state.storedPageCount ||
    [
      state.berichtFile,
      state.gutachtenTableFile,
      state.vorschriftenFile,
      state.vorschriften2File,
    ].filter(Boolean).length;

  function resetToStart() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (gutachtenCropUrlRef.current) {
      URL.revokeObjectURL(gutachtenCropUrlRef.current);
      gutachtenCropUrlRef.current = null;
    }
    setState({
      phase: "capture-bericht",
      berichtFile: null,
      gutachtenFullFile: null,
      gutachtenTableFile: null,
      gutachtenCropSourceUrl: null,
      vorschriftenFile: null,
      vorschriften2File: null,
      draftExtraction: null,
      uploadFile: null,
      storedPageCount: 0,
      previewUrl: null,
      previewKind: "pdf",
      previewOwned: false,
      fields: null,
      approvalFields: null,
      error: null,
    });
    setSaveError(null);
  }

  async function runScopedAnalysis(
    file: File,
    scope: "bericht" | "gutachten" | "vorschriften",
  ): Promise<Paragraph192Extraction | null> {
    const analyzed = await analyzeDocumentFiles([file], undefined, {
      vehicleId,
      documentType: "abe",
      approvalKind: "pruefung192",
      vehicleContext: vehicleContext ?? null,
      garageVin: garageVin ?? null,
      pruefung192Scope: scope,
    });
    return extractionFromAnalyze(analyzed);
  }

  async function runBerichtAnalysis(file: File) {
    try {
      const extracted = await runScopedAnalysis(file, "bericht");
      setState((prev) => ({
        ...prev,
        berichtFile: file,
        draftExtraction: extracted,
        phase: "capture-gutachten",
        error: extracted
          ? null
          : "Seite gespeichert — Felder konnten nicht vollständig ausgelesen werden.",
      }));
    } catch (err) {
      const message =
        err instanceof AnalyzeDocumentError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Untersuchungsbericht konnte nicht ausgelesen werden.";

      setState((prev) => ({
        ...prev,
        berichtFile: file,
        phase: "capture-gutachten",
        error: `${message} — Scan wurde übernommen, Felder im Review prüfen.`,
      }));
    }
  }

  function handleBerichtCapture(file: File) {
    setState((prev) => ({ ...prev, phase: "analyzing-bericht", error: null }));
    void runBerichtAnalysis(file);
  }

  function handleGutachtenCapture(file: File) {
    if (gutachtenCropUrlRef.current) {
      URL.revokeObjectURL(gutachtenCropUrlRef.current);
    }
    const cropUrl = URL.createObjectURL(file);
    gutachtenCropUrlRef.current = cropUrl;
    setState((prev) => ({
      ...prev,
      gutachtenFullFile: file,
      gutachtenCropSourceUrl: cropUrl,
      phase: "crop-gutachten",
      error: null,
    }));
  }

  async function runGutachtenAnalysis(fullFile: File, tableFile: File) {
    const { draftExtraction } = state;
    try {
      const patch = await runScopedAnalysis(fullFile, "gutachten");
      const merged = draftExtraction
        ? mergeParagraph192Extractions(draftExtraction, {
            ...(patch ?? draftExtraction),
            zbTablePreserved: true,
          })
        : patch
          ? { ...patch, zbTablePreserved: true }
          : null;

      setState((prev) => ({
        ...prev,
        gutachtenTableFile: tableFile,
        draftExtraction: merged,
        phase: "capture-vorschriften",
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: "crop-gutachten",
        error:
          err instanceof AnalyzeDocumentError
            ? err.message
            : "Gutachten-Seite konnte nicht ausgelesen werden.",
      }));
    }
  }

  function handleGutachtenCropped(tableFile: File) {
    const { gutachtenFullFile } = state;
    if (!gutachtenFullFile) return;
    setState((prev) => ({ ...prev, phase: "analyzing-gutachten", error: null }));
    void runGutachtenAnalysis(gutachtenFullFile, tableFile);
  }

  async function runFinalAnalysis(
    berichtFile: File,
    gutachtenTableFile: File | null,
    vorschriftenFile: File | null,
    vorschriften2File: File | null,
    draftExtraction: Paragraph192Extraction | null,
  ) {
    try {
      const ordered = [
        berichtFile,
        gutachtenTableFile,
        vorschriftenFile,
        vorschriften2File,
      ].filter((file): file is File => file !== null);

      const { file: uploadFile, pageCount: uploadPageCount } =
        await buildUploadPdf(ordered);

      let extracted = draftExtraction;
      if (vorschriftenFile) {
        const patch = await runScopedAnalysis(vorschriftenFile, "vorschriften");
        if (patch && extracted) {
          extracted = mergeParagraph192Extractions(extracted, patch);
        } else if (patch) {
          extracted = patch;
        }
      }

      const analyzed = extracted
        ? applyExtractionToAnalyze(extracted, null)
        : await analyzeDocumentFiles([uploadFile], undefined, {
            vehicleId,
            documentType: "abe",
            approvalKind: "pruefung192",
            vehicleContext: vehicleContext ?? null,
            garageVin: garageVin ?? null,
          });

      const previewUrl = URL.createObjectURL(uploadFile);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = previewUrl;

      setState((prev) => ({
        ...prev,
        phase: "review",
        uploadFile,
        storedPageCount: uploadPageCount,
        previewUrl,
        previewKind: "pdf",
        previewOwned: true,
        fields: analyzed.fields,
        approvalFields: analyzed.approvalFields,
        draftExtraction: extracted,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: "capture-bericht",
        error:
          err instanceof AnalyzeDocumentError
            ? err.message
            : "Analyse fehlgeschlagen.",
      }));
    }
  }

  function startFinalAnalysis(
    vorschriftenFile: File | null,
    vorschriften2File: File | null,
  ) {
    const {
      berichtFile,
      gutachtenTableFile,
      draftExtraction,
    } = state;
    if (!berichtFile) return;
    setState((prev) => ({
      ...prev,
      vorschriftenFile,
      vorschriften2File,
      phase: "analyzing",
      error: null,
    }));
    void runFinalAnalysis(
      berichtFile,
      gutachtenTableFile,
      vorschriftenFile,
      vorschriften2File,
      draftExtraction,
    );
  }

  function handleVorschriftenCapture(file: File) {
    setState((prev) => ({
      ...prev,
      vorschriftenFile: file,
      phase: "capture-vorschriften-2",
      error: null,
    }));
  }

  function skipVorschriften2() {
    startFinalAnalysis(state.vorschriftenFile, null);
  }

  function handleVorschriften2Capture(file: File) {
    startFinalAnalysis(state.vorschriftenFile, file);
  }

  function handleSave(payload: {
    review: ReturnType<typeof fieldsToPruefung192Review>;
    approvalFields: Extract<ApprovalFields, { kind: "pruefung192" }>;
    title: string;
  }) {
    if (!state.uploadFile) {
      setSaveError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    setSaveError(null);
    const { review, approvalFields: approval, title: storedTitle } = payload;

    const notes = [
      review.licensePlate ? `Kennzeichen: ${review.licensePlate}` : null,
      review.ownerName ? `Halter: ${review.ownerName}` : null,
      review.inspectionResult
        ? `Ergebnis: ${review.inspectionResult === "no_defects" ? "Ohne Mängel" : review.inspectionResult}`
        : null,
      review.field22Text ? `Feld 22:\n${review.field22Text}` : null,
      review.assessedModifications
        ? `Begutachtete Änderungen:\n${review.assessedModifications}`
        : null,
      review.vinMatchesGarage === true
        ? "VIN stimmt mit Garage-Fahrzeug überein."
        : review.vinMatchesGarage === false
          ? "WARNUNG: VIN stimmt NICHT mit Garage-Fahrzeug überein."
          : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    startSave(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
      formData.set("type", "abe");
      formData.set("category", "abe");
      formData.set("vendor", review.vehicleType?.trim() ?? storedTitle);
      formData.set(
        "date",
        normalizeDocumentDateIso(review.inspectionDate) ?? localDateIso(),
      );
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", review.reportNumber?.trim() ?? "");
      formData.set(
        "vehicleApprovals",
        review.vin ? JSON.stringify([`VIN ${review.vin}`]) : "",
      );
      formData.set("authority", review.testingOrganization?.trim() ?? "");
      formData.set(
        "conditions",
        review.field22Text ? JSON.stringify([review.field22Text.slice(0, 500)]) : "",
      );
      formData.set("partCategory", review.assessedModifications?.trim() ?? "");
      formData.set("notes", notes);
      formData.set("manufacturer", review.manufacturer?.trim() ?? "");
      formData.set("invoiceNumber", review.reportNumber?.trim() ?? "");
      formData.set(
        "mileageKm",
        review.mileageKm != null ? String(review.mileageKm) : "",
      );
      formData.set("pageCount", String(pageCount || 1));
      formData.set(
        "approvalFields",
        JSON.stringify({
          ...approval,
          data: {
            ...approval.data,
            testingOrganization: inferTestingOrganizationLabel(
              review.testingOrganization,
            ),
          },
        }),
      );
      formData.set("file", state.uploadFile!);

      const result = await uploadDocument(formData);
      if (isActionFailure(result)) {
        setSaveError(result.message);
        return;
      }

      const href =
        successHref ?? `/v/${result.tagUuid}/dokumente/${result.document.id}`;
      window.location.assign(href);
    });
  }

  const { phase, error } = state;

  const stepMap: Partial<Record<WizardPhase, number>> = {
    "capture-bericht": 1,
    "capture-gutachten": 2,
    "crop-gutachten": 2,
    "capture-vorschriften": 3,
    "capture-vorschriften-2": 4,
  };
  const showStep = stepMap[phase] ?? 0;

  if (phase === "capture-bericht") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Untersuchungsbericht fotografieren"
          hint="Prüfung nach § 19(2) StVZO · Untersuchungsbericht mit Fahrzeugdaten, Ergebnis (z. B. Ohne Mängel), Kennzeichen & VIN"
          captureStep={{ current: 1, total: TOTAL_STEPS }}
          guideFrame="a4"
          guideFrameDimOutside
          guideSectionAnchor="top"
          guideLabel="Untersuchungsbericht — Prüfung §19(2)"
          guideWatermark="Prüfung nach § 19(2) StVZO"
          allowPdf
          onCapture={handleBerichtCapture}
          onClose={onBack ?? resetToStart}
        />
      </>
    );
  }

  if (phase === "capture-gutachten") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Gutachten zur Erlangung fotografieren"
          hint="Gutachten zur Erlangung der Betriebserlaubnis — danach ZB-Tabelle (Felder B, J, E, 2.1 …) zuschneiden"
          captureStep={{ current: 2, total: TOTAL_STEPS }}
          guideFrame="a4"
          guideFrameDimOutside
          guideSectionAnchor="top"
          guideLabel="Gutachten zur Erlangung der BE"
          guideWatermark="Daten für die Zulassungsbescheinigung"
          allowPdf
          onCapture={handleGutachtenCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-bericht" }))
          }
        />
      </>
    );
  }

  if (phase === "crop-gutachten" && state.gutachtenCropSourceUrl) {
    return (
      <ImageCropOverlay
        sourceUrl={state.gutachtenCropSourceUrl}
        title="ZB-Tabelle zuschneiden"
        stepNumber={2}
        totalSteps={TOTAL_STEPS}
        confirmLabel="Tabelle übernehmen"
        onCropped={handleGutachtenCropped}
        onCancel={() =>
          setState((prev) => ({ ...prev, phase: "capture-gutachten" }))
        }
      />
    );
  }

  if (phase === "capture-vorschriften") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Technische Vorschriften · Seite 1"
          hint="Aufstellung der technischen Vorschriften — Seite 1 von 2 · begutachtete Änderungen"
          captureStep={{ current: 3, total: TOTAL_STEPS }}
          guideFrame="a4"
          guideFrameDimOutside
          guideSectionAnchor="top"
          guideLabel="Aufstellung techn. Vorschriften S.1"
          allowPdf
          onCapture={handleVorschriftenCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-gutachten" }))
          }
        />
      </>
    );
  }

  if (phase === "capture-vorschriften-2") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Technische Vorschriften · Seite 2"
          hint="Aufstellung — Seite 2 von 2 (optional)"
          captureStep={{ current: 4, total: TOTAL_STEPS }}
          guideFrame="a4"
          guideFrameDimOutside
          guideSectionAnchor="top"
          guideLabel="Aufstellung techn. Vorschriften S.2"
          allowPdf
          onCapture={handleVorschriften2Capture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-vorschriften" }))
          }
        />
        <button
          type="button"
          onClick={skipVorschriften2}
          className="fixed bottom-[max(6.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-[0.78rem] font-medium text-white backdrop-blur-md"
        >
          <SkipForward className="mr-1 inline h-3.5 w-3.5" />
          Nur Seite 1 — weiter zur Analyse
        </button>
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
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-6 px-4 py-6">
        <Pruefung192Overview
          previewUrl={state.previewUrl}
          previewKind={state.previewKind}
          pageCount={pageCount}
          fields={state.fields}
          approvalFields={state.approvalFields}
          garageVin={garageVin}
          isSaving={saving}
          saveError={saveError}
          onCancel={resetToStart}
          onSave={handleSave}
        />
      </section>
    );
  }

  return (
    <WizardShell>
      <WizardScanHeader
        eyebrow="§ 19 Abs. 2 StVZO"
        title="Prüfung scannen"
        vehicleLabel={vehicleLabel}
        currentStep={showStep}
        totalSteps={TOTAL_STEPS}
        onBack={onBack}
        backHref={backHref}
        backLabel={backLabel}
      />

      {phase === "analyzing-bericht" ? (
        <WizardAnalyzingPanel label="Untersuchungsbericht wird ausgelesen…" />
      ) : null}
      {phase === "analyzing-gutachten" ? (
        <WizardAnalyzingPanel label="Feld 22 wird ausgelesen…" />
      ) : null}
      {phase === "analyzing" ? (
        <WizardAnalyzingPanel label="Prüfung wird zusammengeführt…" />
      ) : null}

      {error && !phase.startsWith("analyzing") ? (
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
