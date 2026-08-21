"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Camera,
  FileText,
  FileUp,
  LoaderCircle,
  Plus,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react";

import { EditableLineItemsSection } from "@/components/documents/editable-line-items-section";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildInvoiceDashboardTitle,
  isPrimaryOilChange,
} from "@/lib/documents/invoice-title";
import { detectOilChangeInvoice } from "@/lib/documents/oil-changes";
import {
  INVOICE_REVIEW_CATEGORIES,
  INVOICE_REVIEW_CATEGORY_LABELS,
  invoiceReviewCategoryFromScanType,
  normalizeInvoiceReviewCategory,
  type InvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";
import { scanTypeDefinition, type ScanType } from "@/lib/documents/scan-types";
import { uploadDocument } from "@/lib/documents/upload-document";
import { documentTypeForTextCategory } from "@/lib/ocr/category-map";
import {
  type InvoiceTextParseCategory,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import { convertImagesToPdf, normalizePageForPdfMerge } from "@/lib/utils/pdf-converter";
import { isWizardOverviewScanPdf } from "@/lib/utils/a4-auto-scan";
import {
  mergeInvoiceWizardExtractions,
  mergeLineItemsExtractions,
  type InvoiceHeaderExtraction,
  type InvoiceLineItemsExtraction,
  type InvoiceOverviewExtraction,
} from "@/lib/ocr/invoice-wizard-merge";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

type WizardPhase =
  | "choose-source"
  | "capture-overview"
  | "capture-header"
  | "capture-line-items"
  | "line-items-hub"
  | "analyzing"
  | "review";

const MAX_LINE_ITEM_BLOCKS = 8;

const INVOICE_SCAN_CAMERA_HINTS = {
  overview:
    "Gesamte Rechnung ins DIN-A4-Feld — senkrecht von oben, parallel zum Blatt",
  header: "Kopf mit Werkstatt, Belegnummer, Datum und KM-Stand",
  lineItems: (blockNumber: number) =>
    blockNumber > 1
      ? `Block ${blockNumber} — nächste Seite mit Positionen fotografieren`
      : "Tabellenbereich mit allen Positionen — senkrecht von oben",
} as const;

interface WizardState {
  phase: WizardPhase;
  overviewFile: File | null;
  headerFile: File | null;
  lineItemsFiles: File[];
  overviewExtraction: InvoiceOverviewExtraction | null;
  headerExtraction: InvoiceHeaderExtraction | null;
  lineItemsExtraction: InvoiceLineItemsExtraction | null;
  fields: InvoiceTextParseResult | null;
  uploadFile: File | null;
  previewUrl: string | null;
  previewOwned: boolean;
  title: string;
  error: string | null;
}

export interface InvoiceUploadWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  scanType: ScanType;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

class InvoiceApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceApiError";
  }
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function callInvoiceStep<T>(
  vehicleId: string,
  file: File,
  step: string,
  label: string,
  lockedCategory?: InvoiceTextParseCategory | null,
): Promise<T> {
  const body = new FormData();
  body.set("vehicleId", vehicleId);
  body.set("file", file);
  body.set("step", step);
  if (lockedCategory) {
    body.set("lockedCategory", lockedCategory);
  }

  const response = await fetch("/api/ocr/invoice", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; extraction: T }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new InvoiceApiError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `${label} fehlgeschlagen (${response.status}).`,
    );
  }
  return (payload as { ok: true; extraction: T }).extraction;
}

async function buildUploadFile(
  overviewFile: File | null,
  lineItemsFiles: File[],
): Promise<File | null> {
  /** Stored PDF: full-page overview + optional line-item blocks only (no header crop). */
  const pages = [overviewFile, ...lineItemsFiles].filter(
    (file): file is File => file !== null,
  );

  if (pages.length === 0) return null;

  if (
    pages.length === 1 &&
    isPdfFile(pages[0]!) &&
    !isWizardOverviewScanPdf(pages[0]!)
  ) {
    return pages[0]!;
  }

  if (pages.length === 1 && isWizardOverviewScanPdf(pages[0]!)) {
    return pages[0]!;
  }

  const unique = pages.filter(
    (file, index) =>
      pages.findIndex(
        (candidate) =>
          candidate.name === file.name && candidate.size === file.size,
      ) === index,
  );

  if (unique.length === 1) {
    return unique[0]!;
  }

  try {
    const sources = await Promise.all(unique.map(normalizePageForPdfMerge));
    const result = await convertImagesToPdf(sources, {
      fileName: `invoice-scan-${Date.now()}`,
      fullBleed: true,
      imageCompression: "MEDIUM",
    });
    return result.file;
  } catch {
    return unique[0]!;
  }
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
            index < currentStep ? "bg-neutral-900" : "bg-neutral-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[0.8rem] text-[color:var(--vd-muted)]">{label}</span>
      <span className="text-[0.85rem] font-medium text-[color:var(--vd-text)]">
        {value ?? "—"}
      </span>
    </div>
  );
}

export function InvoiceUploadWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  scanType,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: InvoiceUploadWizardProps) {
  const scanDef = scanTypeDefinition(scanType);
  const resolvedHeading = scanDef.heading;
  const lockedCategory = scanDef.lockCategory ? scanDef.category : null;
  const defaultReviewCategory = invoiceReviewCategoryFromScanType(scanType);

  const [state, setState] = useState<WizardState>({
    phase: "choose-source",
    overviewFile: null,
    headerFile: null,
    lineItemsFiles: [],
    overviewExtraction: null,
    headerExtraction: null,
    lineItemsExtraction: null,
    fields: null,
    uploadFile: null,
    previewUrl: null,
    previewOwned: false,
    title: "",
    error: null,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startSaveTransition] = useTransition();
  const previewUrlRef = useRef<string | null>(null);
  const lineItemPreviewUrlsRef = useRef<string[]>([]);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [blockPreviewUrls, setBlockPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      for (const url of lineItemPreviewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  function revokeLineItemPreviewUrls() {
    for (const url of lineItemPreviewUrlsRef.current) {
      if (url) URL.revokeObjectURL(url);
    }
    lineItemPreviewUrlsRef.current = [];
  }

  useEffect(() => {
    if (state.phase !== "line-items-hub") {
      revokeLineItemPreviewUrls();
      setBlockPreviewUrls([]);
      return;
    }

    revokeLineItemPreviewUrls();
    const urls = state.lineItemsFiles.map((file) =>
      isPdfFile(file) ? "" : URL.createObjectURL(file),
    );
    lineItemPreviewUrlsRef.current = urls.filter(Boolean);
    setBlockPreviewUrls(urls);

    return () => {
      revokeLineItemPreviewUrls();
    };
  }, [state.phase, state.lineItemsFiles]);

  function setPreviewUrl(url: string | null, owned: boolean) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = owned && url ? url : null;
    setState((prev) => ({ ...prev, previewUrl: url, previewOwned: owned }));
  }

  function resetWizard() {
    setPreviewUrl(null, false);
    revokeLineItemPreviewUrls();
    setState({
      phase: "choose-source",
      overviewFile: null,
      headerFile: null,
      lineItemsFiles: [],
      overviewExtraction: null,
      headerExtraction: null,
      lineItemsExtraction: null,
      fields: null,
      uploadFile: null,
      previewUrl: null,
      previewOwned: false,
      title: "",
      error: null,
    });
    setSaveError(null);
  }

  function exitCaptureToSource() {
    setPreviewUrl(null, false);
    revokeLineItemPreviewUrls();
    setState((prev) => ({
      ...prev,
      phase: "choose-source",
      overviewFile: null,
      headerFile: null,
      lineItemsFiles: [],
      overviewExtraction: null,
      headerExtraction: null,
      lineItemsExtraction: null,
      fields: null,
      uploadFile: null,
      previewUrl: null,
      previewOwned: false,
      title: "",
      error: null,
    }));
  }

  function handlePdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!isPdfFile(file)) {
      setState((prev) => ({
        ...prev,
        error: "Bitte eine PDF-Datei wählen.",
      }));
      return;
    }

    handleOverviewCapture(file);
  }

  function handleOverviewCapture(file: File) {
    if (isPdfFile(file) && !isWizardOverviewScanPdf(file)) {
      setState((prev) => ({
        ...prev,
        overviewFile: file,
        headerFile: file,
        lineItemsFiles: [file],
        phase: "analyzing",
        error: null,
      }));
      void runAnalysis(file, file, [file]);
      return;
    }

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
      lineItemsFiles: [],
      phase: "line-items-hub",
      error: null,
    }));
  }

  function handleLineItemsCapture(file: File) {
    setState((prev) => {
      if (prev.lineItemsFiles.length >= MAX_LINE_ITEM_BLOCKS) {
        return {
          ...prev,
          error: `Maximal ${MAX_LINE_ITEM_BLOCKS} Rechnungsblöcke.`,
        };
      }
      return {
        ...prev,
        lineItemsFiles: [...prev.lineItemsFiles, file],
        phase: "line-items-hub",
        error: null,
      };
    });
  }

  function removeLineItemsBlock(index: number) {
    setState((prev) => ({
      ...prev,
      lineItemsFiles: prev.lineItemsFiles.filter((_, i) => i !== index),
      error: null,
    }));
  }

  function startAnalysisFromHub() {
    const { overviewFile, headerFile, lineItemsFiles } = state;
    if (lineItemsFiles.length === 0) {
      setState((prev) => ({
        ...prev,
        error: "Bitte mindestens einen Rechnungsblock scannen.",
      }));
      return;
    }
    setState((prev) => ({ ...prev, phase: "analyzing", error: null }));
    void runAnalysis(overviewFile, headerFile, lineItemsFiles);
  }

  async function runAnalysis(
    overviewFile: File | null,
    headerFile: File | null,
    lineItemsFiles: File[],
  ) {
    try {
      if (!headerFile) {
        throw new InvoiceApiError("Kein Kopf-Bild vorhanden.");
      }
      if (lineItemsFiles.length === 0) {
        throw new InvoiceApiError("Kein Positions-Bild vorhanden.");
      }

      const [overviewResult, headerResult, lineItemsResults] = await Promise.all([
        overviewFile
          ? callInvoiceStep<InvoiceOverviewExtraction>(
              vehicleId,
              overviewFile,
              "overview",
              "Übersicht-Analyse",
              lockedCategory,
            )
          : Promise.resolve(null),
        callInvoiceStep<InvoiceHeaderExtraction>(
          vehicleId,
          headerFile,
          "header",
          "Kopf-Analyse",
          lockedCategory,
        ),
        Promise.all(
          lineItemsFiles.map((file, index) =>
            callInvoiceStep<InvoiceLineItemsExtraction>(
              vehicleId,
              file,
              "line-items",
              `Positions-Analyse Block ${index + 1}`,
              lockedCategory,
            ),
          ),
        ),
      ]);

      const lineItemsResult = mergeLineItemsExtractions(lineItemsResults);

      const merged = mergeInvoiceWizardExtractions(
        overviewResult,
        headerResult,
        lineItemsResult,
        { lockedCategory },
      );
      const fields = {
        ...merged,
        category: normalizeInvoiceReviewCategory(
          merged.category,
          defaultReviewCategory,
        ),
      };

      const uploadFile = await buildUploadFile(overviewFile, lineItemsFiles);
      const previewSource =
        lineItemsFiles[lineItemsFiles.length - 1] ??
        headerFile ??
        overviewFile;
      const owned =
        previewSource !== null && !previewSource.type.includes("pdf");
      const previewUrl =
        owned && previewSource ? URL.createObjectURL(previewSource) : null;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = previewUrl;

      const defaultTitle =
        fields.summary?.trim() ||
        fields.vendor?.trim() ||
        scanDef.title ||
        "Rechnung";

      setState((prev) => ({
        ...prev,
        phase: "review",
        overviewExtraction: overviewResult,
        headerExtraction: headerResult,
        lineItemsExtraction: lineItemsResult,
        fields,
        uploadFile,
        previewUrl,
        previewOwned: owned,
        title: defaultTitle,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: "line-items-hub",
        error:
          err instanceof Error
            ? err.message
            : "Analyse fehlgeschlagen. Bitte erneut versuchen.",
      }));
    }
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    const { fields, uploadFile, title } = state;
    if (!fields || !uploadFile) {
      setSaveError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    const resolvedTitle = title.trim();
    if (!resolvedTitle) {
      setSaveError("Titel ist erforderlich.");
      return;
    }

    setSaveError(null);
    startSaveTransition(async () => {
      const oil = detectOilChangeInvoice({
        title: resolvedTitle,
        summary: resolvedTitle,
        vendor: fields.vendor,
        category: fields.category,
        notes: fields.notes,
        lineItems: fields.lineItems,
        rawText: null,
      });
      const oilPrimary = isPrimaryOilChange({
        summary: resolvedTitle,
        vendor: fields.vendor,
        category: fields.category,
        lineItems: fields.lineItems,
        rawText: null,
        oil,
      });

      const category = oilPrimary ? "service" : fields.category;
      const storedTitle = buildInvoiceDashboardTitle({
        summary: resolvedTitle,
        vendor: fields.vendor,
        category,
        lineItems: fields.lineItems,
        rawText: null,
        oil,
      });

      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
      formData.set("type", documentTypeForTextCategory(category));
      formData.set("category", category);
      formData.set("vendor", fields.vendor?.trim() ?? "");
      formData.set("date", fields.date ?? "");
      formData.set(
        "amount",
        fields.amount === null || fields.amount === undefined
          ? ""
          : String(fields.amount),
      );
      formData.set(
        "lineItems",
        fields.lineItems?.length ? JSON.stringify(fields.lineItems) : "",
      );
      formData.set("kbaNumber", "");
      formData.set("vehicleApprovals", "");
      formData.set("authority", "");
      formData.set("conditions", "");
      formData.set("technicalSpecs", "");
      formData.set("partCategory", "");
      formData.set(
        "notes",
        oil.isOilChange
          ? (fields.notes?.trim() || oil.notes)
          : (fields.notes?.trim() ?? ""),
      );
      formData.set("manufacturer", "");
      formData.set("invoiceNumber", fields.invoiceNumber?.trim() ?? "");
      formData.set(
        "mileageKm",
        fields.mileageKm === null || fields.mileageKm === undefined
          ? ""
          : String(fields.mileageKm),
      );
      const pageCount = [
        state.overviewFile,
        state.headerFile,
        ...state.lineItemsFiles,
      ].filter(Boolean).length;
      formData.set("pageCount", String(pageCount || 1));
      formData.set("approvalFields", "");
      formData.set("file", uploadFile);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setSaveError(result.message);
        return;
      }

      const href = oilPrimary
        ? `/v/${result.tagUuid}/intervalle`
        : (successHref ??
          `/v/${result.tagUuid}/dokumente/${result.document.id}`);
      window.location.assign(href);
    });
  }

  const { phase, fields, uploadFile, previewUrl, title, error, lineItemsFiles } =
    state;

  if (phase === "choose-source") {
    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
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

        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <ScanLine className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            {scanDef.title} · Upload
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            PDF oder Bilder?
          </h1>
          <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
            {vehicleLabel}
          </p>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
            {error}
          </div>
        ) : null}

        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handlePdfSelected}
        />

        <button
          type="button"
          onClick={() =>
            setState((prev) => ({ ...prev, phase: "capture-overview", error: null }))
          }
          className="group relative w-full rounded-[1.35rem] border-2 border-neutral-900 bg-neutral-900 p-5 text-left text-white shadow-[var(--vd-shadow)] transition-opacity active:opacity-80"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/50">
                Empfohlen
              </p>
              <p className="mt-1 text-[1rem] font-semibold">Bilder scannen</p>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-white/65">
                In-Browser-Kamera · Schritt für Schritt · genauere Texterkennung
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Camera className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium">
              3 Schritte
            </span>
            <span className="rounded-lg bg-emerald-400/20 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-300">
              Genauer
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => pdfInputRef.current?.click()}
          className="group w-full rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-left shadow-[var(--vd-shadow-sm)] transition-colors hover:border-neutral-300 active:bg-neutral-50"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
                Datei-Upload
              </p>
              <p className="mt-1 text-[1rem] font-semibold text-[color:var(--vd-text)]">
                PDF hochladen
              </p>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
                Vorhandene Rechnung als PDF aus Dateien oder Cloud wählen
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)]">
              <FileUp className="h-5 w-5 text-[color:var(--vd-muted)]" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-lg border border-[color:var(--vd-border)] bg-neutral-100 px-2.5 py-1 text-[0.7rem] font-medium text-neutral-600">
              1 Schritt
            </span>
            <span className="rounded-lg border border-[color:var(--vd-border)] bg-neutral-100 px-2.5 py-1 text-[0.7rem] font-medium text-neutral-600">
              Schnell
            </span>
          </div>
        </button>
      </section>
    );
  }

  if (phase === "capture-overview") {
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title="Gesamtseite"
          hint={INVOICE_SCAN_CAMERA_HINTS.overview}
          showTopDownGuide
          captureStep={{ current: 1, total: 3 }}
          guideFrame="a4"
          a4OutputFormat="pdf"
          onCapture={handleOverviewCapture}
          onClose={() => {
            const hasProgress =
              state.overviewFile !== null ||
              state.headerFile !== null ||
              state.lineItemsFiles.length > 0;
            if (
              hasProgress &&
              !window.confirm("Scan abbrechen? Erfasste Fotos gehen verloren.")
            ) {
              return;
            }
            exitCaptureToSource();
          }}
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
          title="Kopf"
          hint={INVOICE_SCAN_CAMERA_HINTS.header}
          showTopDownGuide
          captureStep={{ current: 2, total: 3 }}
          guideFrame="none"
          onCapture={handleHeaderCapture}
          onClose={() =>
            setState((prev) => ({ ...prev, phase: "capture-overview" }))
          }
        />
      </>
    );
  }

  if (phase === "capture-line-items") {
    const blockNumber = lineItemsFiles.length + 1;
    return (
      <>
        {error ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        <InBrowserCamera
          title={blockNumber > 1 ? `Block ${blockNumber}` : "Positionen"}
          hint={INVOICE_SCAN_CAMERA_HINTS.lineItems(blockNumber)}
          showTopDownGuide
          captureStep={{ current: 3, total: 3 }}
          guideFrame="none"
          onCapture={handleLineItemsCapture}
          onClose={() =>
            setState((prev) => ({
              ...prev,
              phase: prev.lineItemsFiles.length > 0 ? "line-items-hub" : "capture-header",
              error: null,
            }))
          }
        />
      </>
    );
  }

  if (phase === "line-items-hub") {
    const canAddMore = lineItemsFiles.length < MAX_LINE_ITEM_BLOCKS;

    return (
      <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
        <header className="space-y-3">
          <button
            type="button"
            onClick={() =>
              setState((prev) => ({ ...prev, phase: "capture-header", error: null }))
            }
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kopf erneut scannen
          </button>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Schritt 3 von 3 · Rechnungsblock
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
              Rechnungsblöcke
            </h1>
            <div className="mt-4">
              <WizardProgress currentStep={3} totalSteps={3} />
            </div>
          </div>
        </header>

        {lineItemsFiles.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2">
            {lineItemsFiles.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="relative overflow-hidden rounded-[1.1rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]"
              >
                {isPdfFile(file) ? (
                  <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100 px-3 text-center text-[0.75rem] font-medium text-[color:var(--vd-muted)]">
                    PDF · Block {index + 1}
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={blockPreviewUrls[index]}
                    alt={`Rechnungsblock ${index + 1}`}
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <span className="absolute left-1.5 top-1.5 rounded-md bg-neutral-900/85 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                  Block {index + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Block ${index + 1} entfernen`}
                  onClick={() => removeLineItemsBlock(index)}
                  className="absolute bottom-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-[color:var(--vd-border)] bg-white px-4 py-8 text-center">
            <p className="text-[0.9rem] font-medium text-[color:var(--vd-text)]">
              Noch kein Rechnungsblock
            </p>
            <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
              Scanne den Tabellenbereich mit allen Positionen.
            </p>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-2">
          {canAddMore ? (
            <>
              <p className="px-1 text-center text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
                Mehrseitige Tabellen? Fotografiere jeden Block separat — z. B. Seite
                1 und Fortsetzung auf Seite 2.
              </p>
              <Button
                type="button"
                variant="outline"
                className="claim-back h-auto min-h-11 py-3"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    phase: "capture-line-items",
                    error: null,
                  }))
                }
              >
                <Plus className="h-4 w-4" aria-hidden />
                {lineItemsFiles.length === 0
                  ? "Rechnungsblock scannen"
                  : "Weiteren Block hinzufügen"}
              </Button>
            </>
          ) : (
            <p className="text-center text-[0.75rem] text-[color:var(--vd-muted)]">
              Maximal {MAX_LINE_ITEM_BLOCKS} Blöcke.
            </p>
          )}

          <Button
            type="button"
            disabled={lineItemsFiles.length === 0}
            className="claim-cta h-auto min-h-11 py-3"
            onClick={startAnalysisFromHub}
          >
            {lineItemsFiles.length <= 1
              ? "Analysieren"
              : `${lineItemsFiles.length} Blöcke analysieren`}
          </Button>
        </div>
      </section>
    );
  }

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
            Rechnung wird analysiert…
          </p>
          <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
            Kopf · Positionen · Gesamtbetrag — direkt ans LLM
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {["Übersicht", "Kopf", "Positionen"].map((label) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"
            >
              <LoaderCircle className="h-3 w-3 animate-spin text-neutral-500" />
              <span className="text-[0.68rem] font-medium text-neutral-600">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const captureStepMap: Partial<Record<WizardPhase, number>> = {
    "capture-overview": 1,
    "capture-header": 2,
    "capture-line-items": 3,
  };
  const showCurrentStep = captureStepMap[phase] ?? 3;
  const canReview = Boolean(state.fields && state.uploadFile);

  return (
    <section className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-4 py-6">
      <header className="space-y-3">
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
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            {scanDef.title} · Review
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            {resolvedHeading}
          </h1>
          <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
            {vehicleLabel}
          </p>
          <div className="mt-4">
            <WizardProgress currentStep={showCurrentStep} totalSteps={3} />
          </div>
        </div>
      </header>

      {canReview && fields && uploadFile ? (
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white p-4 shadow-[var(--vd-shadow-sm)]">
            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Titel
              </span>
              <Input
                value={title}
                onChange={(event) =>
                  setState((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </Label>

            <ReviewRow label="Werkstatt" value={fields.vendor} />
            <ReviewRow label="Belegnr." value={fields.invoiceNumber} />
            <ReviewRow
              label="KM-Stand"
              value={
                fields.mileageKm === null ? null : `${fields.mileageKm} km`
              }
            />

            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Art der Rechnung
              </span>
              <select
                value={fields.category}
                onChange={(event) =>
                  setState((prev) =>
                    prev.fields
                      ? {
                          ...prev,
                          fields: {
                            ...prev.fields,
                            category: event.target
                              .value as InvoiceReviewCategory,
                          },
                        }
                      : prev,
                  )
                }
                className="claim-input mt-1"
              >
                {INVOICE_REVIEW_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {INVOICE_REVIEW_CATEGORY_LABELS[option]}
                  </option>
                ))}
              </select>
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <Label>
                <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                  Betrag (€)
                </span>
                <Input
                  inputMode="decimal"
                  value={
                    fields.amount === null || fields.amount === undefined
                      ? ""
                      : String(fields.amount)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    if (!raw) {
                      setState((prev) =>
                        prev.fields
                          ? {
                              ...prev,
                              fields: { ...prev.fields, amount: null },
                            }
                          : prev,
                      );
                      return;
                    }
                    const value = Number.parseFloat(raw.replace(",", "."));
                    if (!Number.isFinite(value)) return;
                    setState((prev) =>
                      prev.fields
                        ? {
                            ...prev,
                            fields: { ...prev.fields, amount: value },
                          }
                        : prev,
                    );
                  }}
                />
              </Label>
              <Label>
                <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                  Datum
                </span>
                <GermanDateInput
                  value={fields.date}
                  onChange={(iso) =>
                    setState((prev) =>
                      prev.fields
                        ? {
                            ...prev,
                            fields: {
                              ...prev.fields,
                              date: iso,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Label>
            </div>

            <EditableLineItemsSection
              items={fields.lineItems ?? []}
              totalAmount={fields.amount}
              emptyHint="Keine Positionen erkannt — Positionen-Scan wiederholen oder manuell ergänzen."
              onChange={(lineItems) =>
                setState((prev) =>
                  prev.fields
                    ? {
                        ...prev,
                        fields: {
                          ...prev.fields,
                          lineItems: lineItems.length ? lineItems : null,
                        },
                      }
                    : prev,
                )
              }
            />
          </div>

          <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
            {previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Dokumentvorschau"
                className="max-h-[36vh] w-full bg-neutral-100 object-contain"
              />
            ) : isPdfFile(uploadFile) ? (
              <div className="flex max-h-[36vh] flex-col items-center justify-center gap-2 bg-neutral-100 px-4 py-10 text-center">
                <FileText className="h-10 w-10 text-neutral-400" aria-hidden />
                <p className="text-[0.85rem] font-medium text-[color:var(--vd-text)]">
                  {uploadFile.name}
                </p>
                <p className="text-[0.75rem] text-[color:var(--vd-muted)]">
                  PDF bereit zum Speichern
                </p>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--vd-border)] px-3 py-2.5 text-[0.75rem] text-[color:var(--vd-muted)]">
              <span>{formatBytes(uploadFile.size)}</span>
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex items-center gap-1 font-medium text-[color:var(--vd-text)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Neu scannen
              </button>
            </div>
          </div>

          {saveError ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
            >
              {saveError}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="claim-cta">
            {pending ? "Wird gespeichert…" : "Speichern & fertig"}
          </Button>
        </form>
      ) : (
        <div
          role="alert"
          className="rounded-[1.35rem] border border-amber-300/70 bg-amber-50 px-4 py-4 text-[0.85rem] text-amber-950"
        >
          <p className="font-semibold">Review konnte nicht geladen werden</p>
          <p className="mt-1 leading-relaxed">
            {state.error ??
              "Analyse oder Datei fehlt — bitte erneut scannen oder analysieren."}
          </p>
          <Button
            type="button"
            variant="outline"
            className="claim-back mt-4 w-full"
            onClick={resetWizard}
          >
            Neu scannen
          </Button>
        </div>
      )}
    </section>
  );
}
