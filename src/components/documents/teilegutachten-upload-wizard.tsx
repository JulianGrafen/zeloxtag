"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  ScanLine,
  SkipForward,
} from "lucide-react";

import {
  TeilegutachtenOverview,
  type TeilegutachtenReviewFields,
} from "@/components/dashboard/TeilegutachtenOverview";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import {
  WizardAnalyzingPanel,
  WizardCameraError,
  WizardScanHeader,
  WizardShell,
} from "@/components/documents/wizard-scan-shell";
import { Button } from "@/components/ui/button";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { localDateIso, normalizeDocumentDateIso } from "@/lib/documents/format";
import { uploadDocument } from "@/lib/documents/upload-document";
import {
  mergeTeilegutachtenExtractions,
  nextTeilegutachtenWizardPhaseAfterAuflagen,
  nextTeilegutachtenWizardPhaseAfterMarking,
  nextTeilegutachtenWizardPhaseAfterTechnical,
} from "@/lib/documents/teilegutachten-wizard-routing";
import { mergeTeilegutachtenCompatibilityTables } from "@/lib/validations/teilegutachten-compatibility-table";
import {
  analyzeDocumentFiles,
  AnalyzeDocumentError,
  type AnalyzeDocumentResult,
} from "@/lib/ocr/analyze-document-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  teilegutachtenReviewToExtraction,
  teilegutachtenToAnalyzeFields,
  teilegutachtenToApprovalFields,
} from "@/lib/validations/teilegutachtenSchema";
import { technicalSpecsFromTeilegutachtenTable } from "@/lib/validations/teilegutachten-technical-data";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import { convertImagesToPdf, normalizePageForPdfMerge } from "@/lib/utils/pdf-converter";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardPhase =
  | "capture-cover"
  | "analyzing-cover"
  | "capture-marking"
  | "analyzing-marking"
  | "capture-verwendungsbereich"
  | "analyzing-verwendungsbereich"
  | "capture-auflagen"
  | "capture-technical-prompt"
  | "capture-technical"
  | "analyzing"
  | "review";

interface WizardState {
  phase: WizardPhase;
  coverFile: File | null;
  coverAnalysis: AnalyzeDocumentResult | null;
  markingFile: File | null;
  verwendungsbereichFile: File | null;
  auflagenFile: File | null;
  technicalFile: File | null;
  uploadFile: File | null;
  storedPageCount: number;
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

function mergeAnalyzeFields(
  cover: InvoiceTextParseResult,
  full: InvoiceTextParseResult,
): InvoiceTextParseResult {
  const pickLonger = (a: string | null | undefined, b: string | null | undefined) => {
    const left = a?.trim() ?? "";
    const right = b?.trim() ?? "";
    if (!left) return right || null;
    if (!right) return left;
    return right.length > left.length ? right : left;
  };

  return {
    ...full,
    vendor: pickLonger(cover.vendor, full.vendor),
    date: full.date ?? cover.date,
    kbaNumber: full.kbaNumber ?? cover.kbaNumber,
    manufacturer: pickLonger(cover.manufacturer, full.manufacturer),
    partCategory: pickLonger(cover.partCategory, full.partCategory),
    vehicleApprovals:
      (full.vehicleApprovals?.length ?? 0) >= (cover.vehicleApprovals?.length ?? 0)
        ? full.vehicleApprovals
        : cover.vehicleApprovals,
    authority: full.authority ?? cover.authority,
    conditions:
      (full.conditions?.length ?? 0) >= (cover.conditions?.length ?? 0)
        ? full.conditions
        : cover.conditions,
    notes: pickLonger(cover.notes, full.notes),
    invoiceNumber: full.invoiceNumber ?? cover.invoiceNumber,
  };
}

function mergeApprovalFields(
  cover: ApprovalFields | null,
  full: ApprovalFields | null,
): ApprovalFields | null {
  if (!cover || cover.kind !== "teilegutachten") return full;
  if (!full || full.kind !== "teilegutachten") return cover;

  return {
    kind: "teilegutachten",
    data: {
      ...full.data,
      documentNumber: full.data.documentNumber || cover.data.documentNumber,
      testingOrganization:
        full.data.testingOrganization || cover.data.testingOrganization,
      validityArea:
        full.data.validityArea.length >= cover.data.validityArea.length
          ? full.data.validityArea
          : cover.data.validityArea,
      compatibilityTable: mergeTeilegutachtenCompatibilityTables(
        full.data.compatibilityTable,
        cover.data.compatibilityTable,
      ),
      technicalDataTable:
        full.data.technicalDataTable?.rows?.length
          ? full.data.technicalDataTable
          : cover.data.technicalDataTable,
      ownerNotes: full.data.ownerNotes || cover.data.ownerNotes,
      markingType: full.data.markingType || cover.data.markingType,
      markingNumber: full.data.markingNumber || cover.data.markingNumber,
    },
  };
}

function extractionFromAnalyzeResult(
  result: AnalyzeDocumentResult,
): ReturnType<typeof teilegutachtenReviewToExtraction> | null {
  if (result.approvalFields?.kind !== "teilegutachten") return null;
  const approval = result.approvalFields.data;
  return teilegutachtenReviewToExtraction({
    certificateNumber: result.fields.kbaNumber ?? result.fields.invoiceNumber,
    issueDate: result.fields.date,
    manufacturer: result.fields.manufacturer,
    modificationType: result.fields.partCategory,
    partCategory: result.fields.partCategory,
    partType: result.fields.vendor,
    markingType: approval.markingType ?? null,
    markingNumber: approval.markingNumber ?? null,
    physicalMarking: null,
    testingOrganization: result.fields.authority ?? null,
    userVehicleMatchStatus: null,
    matchedVehicleRow: result.fields.vehicleApprovals?.[0] ?? null,
    compatibilityTable: approval.compatibilityTable ?? null,
    technicalDataTable: approval.technicalDataTable ?? null,
    verwendungsbereich: result.fields.notes?.includes("Verwendungsbereich:")
      ? result.fields.notes
      : approval.validityArea ?? null,
    ownerNotes: approval.ownerNotes ?? null,
    auflagen: result.fields.conditions ?? null,
  });
}

const TOTAL_STEPS = 5;

function mergeMarkingAnalysis(
  cover: AnalyzeDocumentResult,
  marking: AnalyzeDocumentResult,
): AnalyzeDocumentResult {
  return {
    ...cover,
    fields: mergeAnalyzeFields(cover.fields, marking.fields),
    approvalFields: mergeApprovalFields(cover.approvalFields, marking.approvalFields),
  };
}

function mergeVerwendungsbereichAnalysis(
  cover: AnalyzeDocumentResult,
  table: AnalyzeDocumentResult,
): AnalyzeDocumentResult {
  return {
    ...cover,
    fields: mergeAnalyzeFields(cover.fields, table.fields),
    approvalFields: mergeApprovalFields(cover.approvalFields, table.approvalFields),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  try {
    const sources = await Promise.all(pages.map(normalizePageForPdfMerge));
    const result = await convertImagesToPdf(sources, {
      fileName: `teilegutachten-scan-${Date.now()}`,
      fullBleed: true,
      imageCompression: "MEDIUM",
    });
    return { file: result.file, pageCount: result.pageCount };
  } catch {
    const fallback = pages[0]!;
    return { file: fallback, pageCount: 1 };
  }
}

function teilegutachtenAnalyzingLabel(
  coverOnly: boolean,
  markingOnly: boolean,
  verwendungsbereichOnly: boolean,
): { label: string; subtitle: string } {
  if (coverOnly) {
    return {
      label: "Erste Seite wird ausgelesen…",
      subtitle:
        "Fahrzeugteil, Art der Umrüstung, Teiletyp, Fz-Typen und Hersteller werden extrahiert.",
    };
  }
  if (markingOnly) {
    return {
      label: "Kennzeichnung wird ausgelesen…",
      subtitle: "Art der Kennzeichnung und Kennzeichnungsnummer werden erkannt.",
    };
  }
  if (verwendungsbereichOnly) {
    return {
      label: "Verwendungsbereich wird ausgelesen…",
      subtitle: "Die Fahrzeug-Tabelle wird Zeile für Zeile extrahiert.",
    };
  }
  return {
    label: "Teilegutachten wird analysiert…",
    subtitle:
      "Gutachtennummer, Verwendungsbereich und Auflagen werden ausgelesen.",
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Guided Teilegutachten upload — section-by-section capture, then one OCR pass.
 *
 * Steps: Titelseite → Kennzeichnung → Punkt IV → optional Technische Daten → Verwendungsbereich → Review.
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
    coverAnalysis: null,
    markingFile: null,
    verwendungsbereichFile: null,
    auflagenFile: null,
    technicalFile: null,
    uploadFile: null,
    storedPageCount: 0,
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

  const pageCount =
    state.storedPageCount ||
    [
      state.coverFile,
      state.markingFile,
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
      coverAnalysis: null,
      markingFile: null,
      verwendungsbereichFile: null,
      auflagenFile: null,
      technicalFile: null,
      uploadFile: null,
      storedPageCount: 0,
      previewUrl: null,
      previewKind: "image",
      previewOwned: false,
      fields: null,
      approvalFields: null,
      error: null,
    });
    setSaveError(null);
  }

  async function applyAnalysisResult(
    coverFile: File,
    uploadFile: File,
    uploadPageCount: number,
    analyzed: AnalyzeDocumentResult,
    coverAnalysis: AnalyzeDocumentResult | null,
  ) {
    const fields = coverAnalysis
      ? mergeAnalyzeFields(coverAnalysis.fields, analyzed.fields)
      : analyzed.fields;
    const approvalFields = mergeApprovalFields(
      coverAnalysis?.approvalFields ?? null,
      analyzed.approvalFields,
    );

    const coverExtraction = coverAnalysis
      ? extractionFromAnalyzeResult(coverAnalysis)
      : null;
    const fullExtraction = extractionFromAnalyzeResult({
      ...analyzed,
      fields,
      approvalFields,
    });
    if (coverExtraction && fullExtraction) {
      const merged = mergeTeilegutachtenExtractions(
        coverExtraction,
        fullExtraction,
      );
      const mergedFields = teilegutachtenToAnalyzeFields(merged);
      const mergedApproval = teilegutachtenToApprovalFields(merged);
      analyzed = {
        ...analyzed,
        fields: mergedFields,
        approvalFields: mergedApproval,
      };
    } else {
      analyzed = { ...analyzed, fields, approvalFields };
    }

    const previewSource = uploadFile ?? coverFile;
    let previewUrl: string | null = null;
    let previewKind: "pdf" | "image" = "image";
    let previewOwned = false;

    if (previewSource) {
      previewUrl = URL.createObjectURL(previewSource);
      previewKind = isPdfFile(previewSource) ? "pdf" : "image";
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
      storedPageCount: uploadPageCount,
      previewUrl,
      previewKind,
      previewOwned,
      fields: analyzed.fields,
      approvalFields: analyzed.approvalFields,
      error: null,
    }));
  }

  async function runCoverAnalysis(coverFile: File) {
    try {
      const analyzed = await analyzeDocumentFiles([coverFile], undefined, {
        vehicleId,
        documentType: "abe",
        approvalKind: "teilegutachten",
        vehicleContext: vehicleContext ?? null,
        teilegutachtenScope: "cover",
      });

      setState((prev) => ({
        ...prev,
        coverAnalysis: analyzed,
        phase: "capture-marking",
        error: null,
      }));
    } catch (err) {
      const message =
        err instanceof AnalyzeDocumentError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erste Seite konnte nicht ausgelesen werden.";

      setState((prev) => ({
        ...prev,
        phase: "capture-cover",
        error: message,
      }));
    }
  }

  function advanceAfterMarking(
    coverAnalysis: AnalyzeDocumentResult,
    markingFile?: File | null,
  ) {
    setState((prev) => ({
      ...prev,
      coverAnalysis,
      markingFile: markingFile ?? prev.markingFile,
      phase: nextTeilegutachtenWizardPhaseAfterMarking(),
      error: null,
    }));
  }

  function advanceAfterAuflagen(
    coverAnalysis: AnalyzeDocumentResult,
    auflagenFile?: File | null,
  ) {
    setState((prev) => ({
      ...prev,
      coverAnalysis,
      auflagenFile: auflagenFile ?? prev.auflagenFile,
      phase: nextTeilegutachtenWizardPhaseAfterAuflagen(),
      error: null,
    }));
  }

  async function runMarkingAnalysis(
    markingFile: File,
    coverAnalysis: AnalyzeDocumentResult,
  ) {
    try {
      const markingResult = await analyzeDocumentFiles([markingFile], undefined, {
        vehicleId,
        documentType: "abe",
        approvalKind: "teilegutachten",
        vehicleContext: vehicleContext ?? null,
        teilegutachtenScope: "marking",
      });

      const merged = mergeMarkingAnalysis(coverAnalysis, markingResult);
      advanceAfterMarking(merged, markingFile);
    } catch (err) {
      const message =
        err instanceof AnalyzeDocumentError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Kennzeichnung konnte nicht ausgelesen werden.";

      setState((prev) => ({
        ...prev,
        phase: "capture-marking",
        error: message,
      }));
    }
  }

  async function runAnalysis(
    coverFile: File,
    markingFile: File | null,
    verwendungsbereichFile: File | null,
    auflagenFile: File | null,
    technicalFile: File | null,
    coverAnalysis: AnalyzeDocumentResult | null,
  ) {
    try {
      const ordered = [
        coverFile,
        markingFile,
        auflagenFile,
        technicalFile,
        verwendungsbereichFile,
      ].filter((file): file is File => file !== null);

      const { file: uploadFile, pageCount: uploadPageCount } =
        await buildUploadPdf(ordered);
      const analyzed = await analyzeDocumentFiles([uploadFile], undefined, {
        vehicleId,
        documentType: "abe",
        approvalKind: "teilegutachten",
        vehicleContext: vehicleContext ?? null,
      });

      await applyAnalysisResult(
        coverFile,
        uploadFile,
        uploadPageCount,
        analyzed,
        coverAnalysis,
      );
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
    markingFile: File | null,
    verwendungsbereichFile: File | null,
    auflagenFile: File | null,
    technicalFile: File | null,
    coverAnalysis: AnalyzeDocumentResult | null,
  ) {
    setState((prev) => ({ ...prev, phase: "analyzing", error: null }));
    void runAnalysis(
      coverFile,
      markingFile,
      verwendungsbereichFile,
      auflagenFile,
      technicalFile,
      coverAnalysis,
    );
  }

  function handleCoverCapture(file: File) {
    setState((prev) => ({
      ...prev,
      coverFile: file,
      phase: "analyzing-cover",
      error: null,
    }));
    void runCoverAnalysis(file);
  }

  function handleMarkingCapture(file: File) {
    const coverAnalysis = state.coverAnalysis;
    if (!coverAnalysis) {
      setState((prev) => ({
        ...prev,
        error: "Titelseite fehlt — bitte erneut scannen.",
        phase: "capture-cover",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      markingFile: file,
      phase: "analyzing-marking",
      error: null,
    }));
    void runMarkingAnalysis(file, coverAnalysis);
  }

  function skipMarking() {
    const { coverAnalysis } = state;
    if (!coverAnalysis) return;
    advanceAfterMarking(coverAnalysis);
  }

  function skipAuflagen() {
    const { coverAnalysis } = state;
    if (!coverAnalysis) return;
    advanceAfterAuflagen(coverAnalysis);
  }

  async function runVerwendungsbereichAnalysis(
    verwendungsbereichFile: File,
    coverFile: File,
    markingFile: File | null,
    auflagenFile: File | null,
    technicalFile: File | null,
    coverAnalysis: AnalyzeDocumentResult,
  ) {
    try {
      const tableResult = await analyzeDocumentFiles(
        [verwendungsbereichFile],
        undefined,
        {
          vehicleId,
          documentType: "abe",
          approvalKind: "teilegutachten",
          vehicleContext: vehicleContext ?? null,
          teilegutachtenScope: "verwendungsbereich",
        },
      );

      const mergedCover = mergeVerwendungsbereichAnalysis(
        coverAnalysis,
        tableResult,
      );

      startAnalysis(
        coverFile,
        markingFile,
        verwendungsbereichFile,
        auflagenFile,
        technicalFile,
        mergedCover,
      );
    } catch (err) {
      const message =
        err instanceof AnalyzeDocumentError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Verwendungsbereich konnte nicht ausgelesen werden.";

      setState((prev) => ({
        ...prev,
        phase: "capture-verwendungsbereich",
        error: message,
      }));
    }
  }

  function handleVerwendungsbereichCapture(file: File) {
    const {
      coverFile,
      markingFile,
      auflagenFile,
      technicalFile,
      coverAnalysis,
    } = state;
    if (!coverFile || !coverAnalysis) {
      setState((prev) => ({
        ...prev,
        error: "Titelseite fehlt — bitte erneut scannen.",
        phase: "capture-cover",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      verwendungsbereichFile: file,
      phase: "analyzing-verwendungsbereich",
      error: null,
    }));
    void runVerwendungsbereichAnalysis(
      file,
      coverFile,
      markingFile,
      auflagenFile,
      technicalFile,
      coverAnalysis,
    );
  }

  function skipVerwendungsbereich() {
    const {
      coverFile,
      markingFile,
      auflagenFile,
      technicalFile,
      coverAnalysis,
    } = state;
    if (!coverFile) return;
    startAnalysis(
      coverFile,
      markingFile,
      null,
      auflagenFile,
      technicalFile,
      coverAnalysis,
    );
  }

  function handleAuflagenCapture(file: File) {
    const { coverAnalysis } = state;
    if (!coverAnalysis) {
      setState((prev) => ({
        ...prev,
        auflagenFile: file,
        phase: "capture-technical-prompt",
        error: null,
      }));
      return;
    }
    advanceAfterAuflagen(coverAnalysis, file);
  }

  function handleTechnicalCapture(file: File) {
    setState((prev) => ({
      ...prev,
      technicalFile: file,
      phase: nextTeilegutachtenWizardPhaseAfterTechnical(),
      error: null,
    }));
  }

  function skipTechnical() {
    setState((prev) => ({
      ...prev,
      phase: nextTeilegutachtenWizardPhaseAfterTechnical(),
      error: null,
    }));
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
    "capture-marking": 2,
    "capture-auflagen": 3,
    "capture-technical-prompt": 4,
    "capture-technical": 4,
    "capture-verwendungsbereich": 5,
  };
  const showCurrentStep = captureStepMap[phase] ?? 0;

  // ── Camera views (full-screen) ─────────────────────────────────────────────

  if (phase === "capture-cover") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Erste Seite fotografieren"
          hint="TEILEGUTACHTEN · Fahrzeugteil, Art der Umrüstung, Fz-Teile Type, Für Fz-Typen, Hersteller"
          captureStep={{ current: 1, total: TOTAL_STEPS }}
          guideFrame="a4"
          guideFrameDimOutside
          guideSectionAnchor="top"
          guideLabel="Titelseite mit TEILEGUTACHTEN & Kopffeldern"
          allowPdf
          onCapture={handleCoverCapture}
          onClose={onBack ?? resetToStart}
        />
      </>
    );
  }

  if (phase === "capture-marking") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Kennzeichnung fotografieren"
          hint="Aufdruck am Bauteil · Prägung · Typenschild — Nummer muss lesbar sein"
          captureStep={{ current: 2, total: TOTAL_STEPS }}
          guideFrame="section"
          guideSectionAnchor="center"
          guideLabel="Kennzeichnung am Bauteil — Art & Nummer"
          allowPdf
          a4AutoCrop={false}
          enforceCaptureQuality
          onCapture={handleMarkingCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-cover" }))
          }
        />
        <button
          type="button"
          onClick={skipMarking}
          className="fixed bottom-[max(6.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-[0.78rem] font-medium text-white backdrop-blur-md"
        >
          Überspringen — in Review nachtragen
        </button>
      </>
    );
  }

  if (phase === "capture-auflagen") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Punkt IV fotografieren"
          hint="Abschnitt IV · Auflagen und Hinweise — komplett erfassen"
          captureStep={{ current: 3, total: TOTAL_STEPS }}
          guideFrame="section"
          guideSectionAnchor="top"
          guideLabel="IV. Auflagen und Hinweise"
          allowPdf
          onCapture={handleAuflagenCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-marking" }))
          }
        />
        <button
          type="button"
          onClick={skipAuflagen}
          className="fixed bottom-[max(6.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-[0.78rem] font-medium text-white backdrop-blur-md"
        >
          Überspringen — in Review nachtragen
        </button>
      </>
    );
  }

  if (phase === "capture-verwendungsbereich") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title="Verwendungsbereich fotografieren"
          hint="Komplette Fahrzeug-Tabelle erfassen"
          captureStep={{ current: 5, total: TOTAL_STEPS }}
          guideFrame="table"
          guideLabel="Verwendungsbereich — alle Spalten & Zeilen"
          allowPdf
          onCapture={handleVerwendungsbereichCapture}
          onClose={() =>
            setState((prev) => ({
              ...prev,
              phase: prev.technicalFile
                ? "capture-technical"
                : "capture-technical-prompt",
            }))
          }
        />
        <button
          type="button"
          onClick={skipVerwendungsbereich}
          className="fixed bottom-[max(6.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-[0.78rem] font-medium text-white backdrop-blur-md"
        >
          Überspringen — in Review nachtragen
        </button>
      </>
    );
  }

  if (phase === "capture-technical") {
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
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
    <WizardShell>
      <WizardScanHeader
        eyebrow="Teilegutachten · § 19 Abs. 3"
        title={
          phase === "capture-technical-prompt"
            ? "Weitere Seiten?"
            : "Teilegutachten scannen"
        }
        vehicleLabel={vehicleLabel}
        currentStep={showCurrentStep}
        totalSteps={TOTAL_STEPS}
        onBack={onBack}
        backHref={backHref}
        backLabel={backLabel}
      />

      {phase === "analyzing" ? (
        <WizardAnalyzingPanel
          {...teilegutachtenAnalyzingLabel(false, false, false)}
        />
      ) : null}
      {phase === "analyzing-cover" ? (
        <WizardAnalyzingPanel {...teilegutachtenAnalyzingLabel(true, false, false)} />
      ) : null}
      {phase === "analyzing-marking" ? (
        <WizardAnalyzingPanel {...teilegutachtenAnalyzingLabel(false, true, false)} />
      ) : null}
      {phase === "analyzing-verwendungsbereich" ? (
        <WizardAnalyzingPanel
          {...teilegutachtenAnalyzingLabel(false, false, true)}
        />
      ) : null}

      {phase === "capture-technical-prompt" ? (
        <div className="space-y-3">
          <p className="text-center text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            Liegen Technische Daten (Abschnitt&nbsp;II) oder Hinweise für den
            Halter auf separaten Seiten? Falls ja, jetzt fotografieren — danach
            folgt der Verwendungsbereich.
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
            Weiter — keine Technischen Daten
          </button>
        </div>
      ) : null}

      {error &&
      phase !== "analyzing" &&
      phase !== "analyzing-marking" &&
      phase !== "analyzing-verwendungsbereich" ? (
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
    </WizardShell>
  );
}
