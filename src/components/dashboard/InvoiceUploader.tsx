"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  FileText,
  Info,
  LoaderCircle,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import { ABEOverview } from "@/components/dashboard/ABEOverview";
import { CameraCapture } from "@/components/documents/camera-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { localDateIso } from "@/lib/documents/format";
import {
  buildInvoiceDashboardTitle,
  isPrimaryOilChange,
} from "@/lib/documents/invoice-title";
import { detectOilChangeInvoice } from "@/lib/documents/oil-changes";
import {
  scanTypeDefinition,
  type ScanType,
} from "@/lib/documents/scan-types";
import { uploadDocument } from "@/lib/documents/upload-document";
import {
  abePartCategoryLabel,
  coerceAbePartCategory,
  type AbeCoreParseResult,
} from "@/lib/ocr/abe-parse-schema";
import { analyzeDocumentFiles } from "@/lib/ocr/analyze-document-client";
import {
  documentTypeForTextCategory,
  titleFromAbeFields,
} from "@/lib/ocr/category-map";
import type { CompressedPage } from "@/lib/ocr/compress-page";
import {
  ingestImageFile,
  processInvoiceDocuments,
  revokeCompressedPages,
  type ProcessorProgress,
} from "@/lib/ocr/processor";
import {
  INVOICE_TEXT_PARSE_CATEGORIES,
  type InvoiceTextParseCategory,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";

const CATEGORY_LABELS: Record<InvoiceTextParseCategory, string> = {
  tuning: "Tuning",
  service: "Service / Inspektion",
  tuev: "TÜV / HU",
  repair: "Reparatur",
  abe: "ABE / Gutachten",
  other: "Sonstiges",
};

const MAX_PAGES = 12;

type WizardStep = "compose" | "extracting" | "review";

interface InvoiceUploaderProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  /** Override back navigation target (default: documents list). */
  backHref?: string;
  backLabel?: string;
  /** Prefer in-page back when scanner is embedded on the dashboard. */
  onBack?: () => void;
  /** Prefill / lock OCR category (e.g. service for Inspektionen). */
  initialCategory?: InvoiceTextParseCategory;
  lockCategory?: boolean;
  /** Explicit scan intent from type picker — drives OCR schema. */
  scanType?: ScanType;
  /** After successful save (default: documents list for that type). */
  successHref?: string;
  heading?: string;
  subheading?: string;
}

function emptyFields(
  category: InvoiceTextParseCategory = "service",
): InvoiceTextParseResult {
  return {
    vendor: null,
    date: null,
    amount: null,
    category,
    summary: null,
    lineItems: null,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: null,
    conditions: null,
    partCategory: null,
    notes: null,
    manufacturer: null,
    invoiceNumber: null,
    mileageKm: null,
  };
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

/**
 * Document upload wizard: prepare PDF locally, extract fields, review & save.
 */
export function InvoiceUploader({
  vehicleId,
  tagUuid,
  vehicleLabel,
  backHref,
  backLabel = "Zurück",
  onBack,
  initialCategory = "service",
  lockCategory = false,
  scanType,
  successHref,
  heading = "Rechnung scannen",
  subheading,
}: InvoiceUploaderProps) {
  const scanDef = scanType ? scanTypeDefinition(scanType) : null;
  const resolvedCategory = scanDef?.category ?? initialCategory;
  const resolvedLockCategory = scanDef?.lockCategory ?? lockCategory;
  const resolvedHeading = scanDef?.heading ?? heading;
  const resolvedSubheading = scanDef
    ? `${vehicleLabel} · ${scanDef.subheading}`
    : subheading;
  const resolvedBackHref = backHref ?? `/v/${tagUuid}/dokumente`;
  const {
    compressFile,
    isCompressing,
    statusLabel: compressionStatus,
  } = useDocumentCompression();
  const [step, setStep] = useState<WizardStep>("compose");
  const [pages, setPages] = useState<CompressedPage[]>([]);
  const [nativePdf, setNativePdf] = useState<File | null>(null);
  const [pagePrepBusy, setPagePrepBusy] = useState(false);
  const [progress, setProgress] = useState<ProcessorProgress>({
    label: "Vorbereitung…",
    percent: 0,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOwned, setPreviewOwned] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rawText, setRawText] = useState("");
  const [approvalFields, setApprovalFields] = useState<ApprovalFields | null>(
    null,
  );
  const [fields, setFields] = useState<InvoiceTextParseResult>(
    emptyFields(resolvedCategory),
  );
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      revokeCompressedPages(pages);
      if (previewOwned && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // Intentionally only on unmount — pages cleaned explicitly elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearPages() {
    revokeCompressedPages(pages);
    setPages([]);
  }

  function resetWizard() {
    clearPages();
    if (previewOwned && previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setNativePdf(null);
    setStep("compose");
    setPagePrepBusy(false);
    setProgress({ label: "Vorbereitung…", percent: 0 });
    setPreviewUrl(null);
    setPreviewOwned(false);
    setUploadFile(null);
    setPageCount(0);
    setRawText("");
    setApprovalFields(null);
    setFields(emptyFields(resolvedCategory));
    setTitle("");
    setError(null);
  }

  async function handleIncomingFile(file: File) {
    setError(null);
    setPagePrepBusy(true);

    try {
      // Cap 4K camera frames / huge PNGs before A4 crop + OCR.
      const optimized = await compressFile(file);

      if (optimized.kind === "pdf" || isPdfFile(optimized.file)) {
        clearPages();
        setNativePdf(optimized.file);
        return;
      }

      if (nativePdf) {
        setNativePdf(null);
      }

      if (pages.length >= MAX_PAGES) {
        setError(`Maximal ${MAX_PAGES} Seiten pro Beleg.`);
        return;
      }

      const compressed = await ingestImageFile(optimized.file);
      setPages((current) => [...current, compressed]);
    } catch (ingestError) {
      setError(
        ingestError instanceof Error
          ? ingestError.message
          : "Seite konnte nicht komprimiert werden.",
      );
    } finally {
      setPagePrepBusy(false);
    }
  }

  const compressing = isCompressing || pagePrepBusy;

  function removePage(pageId: string) {
    setPages((current) => {
      const target = current.find((page) => page.id === pageId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((page) => page.id !== pageId);
    });
  }

  const isAbeUpload =
    (scanDef?.ocrDocumentType ??
      (resolvedLockCategory && resolvedCategory === "abe" ? "abe" : "invoice")) ===
    "abe";
  const isTuevUpload =
    scanDef?.ocrDocumentType === "tuev" ||
    (resolvedLockCategory && resolvedCategory === "tuev");

  async function runExtraction() {
    setError(null);

    if (!nativePdf && pages.length === 0) {
      setError("Bitte mindestens eine Seite oder ein PDF hinzufügen.");
      return;
    }

    setStep("extracting");
    setProgress({ label: "Vorbereitung…", percent: 4 });

    try {
      const processed = await processInvoiceDocuments(
        nativePdf
          ? { kind: "pdf", file: nativePdf }
          : { kind: "images", pages },
        setProgress,
      );

      const documentType = scanDef?.ocrDocumentType
        ? scanDef.ocrDocumentType
        : isAbeUpload
          ? "abe"
          : isTuevUpload
            ? "tuev"
            : "invoice";
      // ABE family: one combined PDF so Auflagen across pages stay in one parse call.
      const analyzeFiles =
        documentType === "abe" && processed.uploadFile
          ? [processed.uploadFile]
          : processed.analyzeFiles;

      const analyzed = await analyzeDocumentFiles(
        analyzeFiles,
        (page, totalPages) => {
          const span = 25 / Math.max(1, totalPages);
          setProgress({
            label:
              totalPages > 1
                ? `Seite ${page} von ${totalPages} wird analysiert…`
                : documentType === "abe"
                  ? `${scanDef?.title ?? "ABE"} wird analysiert…`
                  : documentType === "tuev"
                    ? "TÜV-Bericht wird analysiert…"
                    : "Rechnung wird analysiert…",
            percent: Math.min(99, Math.round(70 + (page - 1) * span + span * 0.5)),
            page,
            totalPages,
          });
        },
        {
          documentType,
          approvalKind: scanDef?.approvalKind ?? null,
        },
      );

      setUploadFile(processed.uploadFile);
      setPreviewUrl(processed.previewUrl);
      setPreviewOwned(processed.previewUrlOwned);
      setPageCount(processed.pageCount);
      setRawText(analyzed.rawText);
      setApprovalFields(analyzed.approvalFields);

      const oil = detectOilChangeInvoice({
        title: analyzed.fields.summary,
        summary: analyzed.fields.summary,
        vendor: analyzed.fields.vendor,
        category: analyzed.fields.category,
        notes: analyzed.fields.notes,
        lineItems: analyzed.fields.lineItems,
        rawText: analyzed.rawText,
      });
      const oilPrimary = isPrimaryOilChange({
        summary: analyzed.fields.summary,
        vendor: analyzed.fields.vendor,
        category: analyzed.fields.category,
        lineItems: analyzed.fields.lineItems,
        rawText: analyzed.rawText,
        oil,
      });

      const baseFields = resolvedLockCategory
        ? { ...analyzed.fields, category: resolvedCategory }
        : analyzed.fields;

      // Only promote to Service/Ölwechsel title when oil is the main job.
      const nextFields = {
        ...baseFields,
        ...(oilPrimary
          ? {
              category: "service" as const,
              notes: oil.notes,
              summary: oil.title,
            }
          : oil.isOilChange
            ? {
                notes: baseFields.notes?.trim()
                  ? `${baseFields.notes.trim()} · ${oil.notes}`
                  : oil.notes,
              }
            : {}),
      };
      setFields(nextFields);

      const defaultTitle = buildInvoiceDashboardTitle({
        summary: nextFields.summary,
        vendor: nextFields.vendor,
        category: nextFields.category,
        lineItems: nextFields.lineItems,
        rawText: analyzed.rawText,
        oil,
      });
      setTitle(defaultTitle);

      setProgress({ label: "Fertig", percent: 100 });
      setStep("review");
    } catch (extractError) {
      setStep("compose");
      setUploadFile(null);
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Extraktion fehlgeschlagen.",
      );
    }
  }

  const canProcess = Boolean(nativePdf) || pages.length > 0;
  const isAbeReview =
    step === "review" &&
    (fields.category === "abe" || isAbeUpload) &&
    Boolean(previewUrl) &&
    Boolean(uploadFile);

  async function startAbeAwareExtraction() {
    if (isAbeUpload && !nativePdf && pages.length === 1) {
      const confirmed = window.confirm(
        "Du hast nur 1 Seite erfasst. ABEs haben oft mehrere Seiten.\n\nBitte alle Seiten dieses einen Bauteils scannen.\nTrotzdem mit einer Seite fortfahren?",
      );
      if (!confirmed) return;
    }
    await runExtraction();
  }

  const abeInitialFields = useMemo(
    () => ({
      kbaNumber: fields.kbaNumber,
      manufacturer: fields.manufacturer,
      partCategory: coerceAbePartCategory(fields.partCategory),
      partType: fields.vendor ?? fields.summary,
      // ABE document date = scan day (not Ausstellungsdatum from the PDF).
      date: localDateIso(),
      conditions: fields.conditions,
      technicalSpecs: null,
    }),
    [
      fields.kbaNumber,
      fields.manufacturer,
      fields.partCategory,
      fields.vendor,
      fields.summary,
      fields.conditions,
    ],
  );

  function saveAbeDocument(abe: AbeCoreParseResult) {
    if (!uploadFile) {
      setError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    setError(null);
    const partType = abe.partType?.trim() || null;
    const manufacturer = abe.manufacturer?.trim() || null;
    const storedTitle = titleFromAbeFields({ manufacturer, partType });

    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
      formData.set("type", "abe");
      formData.set("category", "abe");
      // Keep Bauteil/Modell in vendor; list title is manufacturer + model.
      formData.set("vendor", partType ?? storedTitle);
      formData.set("date", abe.date?.trim() || localDateIso());
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", abe.kbaNumber?.trim() ?? "");
      formData.set(
        "vehicleApprovals",
        fields.vehicleApprovals?.length
          ? JSON.stringify(fields.vehicleApprovals)
          : "",
      );
      formData.set("authority", fields.authority?.trim() ?? "");
      formData.set(
        "conditions",
        abe.conditions?.length ? JSON.stringify(abe.conditions) : "",
      );
      formData.set(
        "technicalSpecs",
        abe.technicalSpecs?.length
          ? JSON.stringify(abe.technicalSpecs)
          : "",
      );
      formData.set("partCategory", abePartCategoryLabel(abe.partCategory));
      formData.set("notes", fields.notes?.trim() ?? "");
      formData.set("manufacturer", manufacturer ?? "");
      formData.set("invoiceNumber", "");
      formData.set("mileageKm", "");
      formData.set("pageCount", String(pageCount || 1));
      const persistedApproval =
        approvalFields &&
        (!scanDef?.approvalKind ||
          approvalFields.kind === scanDef.approvalKind ||
          scanDef.approvalKind === "abe")
          ? approvalFields
          : scanDef?.approvalKind === "abe"
            ? { kind: "abe" as const }
            : approvalFields;
      formData.set(
        "approvalFields",
        persistedApproval ? JSON.stringify(persistedApproval) : "",
      );
      formData.set("file", uploadFile);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      const href =
        successHref ?? `/v/${result.tagUuid}/dokumente/${result.document.id}`;
      // Hard nav so detail always loads fresh extracted fields (not PDF overlay).
      window.location.assign(href);
    });
  }

  return (
    <section
      className={[
        "mx-auto flex w-full flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5",
        isAbeReview ? "max-w-5xl" : "max-w-lg",
      ].join(" ")}
    >
      <header className="vd-anim-header space-y-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </button>
        ) : (
          <PressableLink
            href={resolvedBackHref}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </PressableLink>
        )}

        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Scanner
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            {resolvedHeading}
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
            {resolvedSubheading ?? `${vehicleLabel} · Beleg einlesen`}
          </p>
        </div>
      </header>

      {step === "compose" ? (
        <div className="vd-anim-header space-y-3">
          {isAbeUpload ? (
            <div
              role="note"
              className="rounded-[1.35rem] border border-amber-300/70 bg-amber-50 px-4 py-3.5 text-[0.84rem] leading-relaxed text-amber-950 shadow-[var(--vd-shadow-sm)]"
            >
              <div className="flex items-start gap-2.5">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
                  aria-hidden
                />
                <div className="space-y-1.5">
                  <p className="font-semibold tracking-[-0.01em]">
                    Ein {scanDef?.title ?? "Gutachten"} = ein Bauteil
                  </p>
                  <p>
                    Lade nur das Dokument für{" "}
                    <span className="font-medium">ein einziges Bauteil</span>{" "}
                    hoch. Scanne bitte{" "}
                    <span className="font-medium">alle Seiten</span> — oder lade
                    das komplette Mehrseiten-PDF.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!nativePdf && pages.length === 0 ? (
            <CameraCapture
              allowPdf
              disabled={compressing}
              hint={
                isAbeUpload
                  ? `Alle Seiten von ${scanDef?.title ?? "ABE"} fotografieren oder als PDF hochladen`
                  : isTuevUpload
                    ? "TÜV-/HU-Bericht fotografieren oder als PDF hochladen"
                    : "Foto wird automatisch auf A4 zugeschnitten und für OCR komprimiert"
              }
              onFileSelected={(file) => {
                void handleIncomingFile(file);
              }}
            />
          ) : null}

          {nativePdf ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white p-4 shadow-[var(--vd-shadow-sm)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                    Native PDF
                  </p>
                  <p className="mt-1 truncate text-[0.92rem] font-medium text-[color:var(--vd-text)]">
                    {nativePdf.name}
                  </p>
                  <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
                    {formatBytes(nativePdf.size)} · wird unverändert hochgeladen
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="PDF entfernen"
                  onClick={() => setNativePdf(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--vd-border)] text-[color:var(--vd-muted)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

          {pages.length > 0 ? (
            <div className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white p-4 shadow-[var(--vd-shadow-sm)]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                  {pages.length} {pages.length === 1 ? "Seite" : "Seiten"}
                </p>
                <button
                  type="button"
                  onClick={clearPages}
                  className="text-[0.78rem] font-medium text-[color:var(--vd-muted)]"
                >
                  Alle entfernen
                </button>
              </div>

              <ul className="grid grid-cols-3 gap-2">
                {pages.map((page, index) => (
                  <li
                    key={page.id}
                    className="relative overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-neutral-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.previewUrl}
                      alt={`Seite ${index + 1}`}
                      className="aspect-[3/4] w-full object-cover"
                    />
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-neutral-900/85 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      aria-label={`Seite ${index + 1} entfernen`}
                      onClick={() => removePage(page.id)}
                      className="absolute bottom-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              {pages.length < MAX_PAGES ? (
                <div className="grid grid-cols-1 gap-2">
                  <CameraCapture
                    disabled={compressing}
                    label="Weitere Seite"
                    hint={
                      isAbeUpload
                        ? "Nächste Seite derselben ABE hinzufügen"
                        : "Nächste Seite fotografieren oder aus der Galerie wählen"
                    }
                    imageButtonLabel="Bild hinzufügen"
                    cameraButtonLabel="Kamera · Seite hinzufügen"
                    onFileSelected={(file) => {
                      void handleIncomingFile(file);
                    }}
                  />
                  <p className="text-center text-[0.75rem] text-[color:var(--vd-muted)]">
                    <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    {isAbeUpload
                      ? `Weitere Seite derselben ABE · max. ${MAX_PAGES}`
                      : `Weitere Seite hinzufügen · max. ${MAX_PAGES}`}
                  </p>
                </div>
              ) : null}

              {isAbeUpload && pages.length === 1 ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-950">
                  Nur 1 Seite erfasst — fehlen noch Seiten dieser ABE? Bitte
                  alle Seiten dieses Bauteils hinzufügen.
                </p>
              ) : null}
            </div>
          ) : null}

          {compressing ? (
            <p className="flex items-center justify-center gap-2 text-[0.82rem] text-[color:var(--vd-muted)]">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              {compressionStatus ?? "Optimiere Dateien…"}
            </p>
          ) : null}

          {canProcess ? (
            <Button
              type="button"
              disabled={compressing}
              onClick={() => {
                void startAbeAwareExtraction();
              }}
              className="claim-cta"
            >
              Text erkennen & fortfahren
            </Button>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
            >
              {error}
            </p>
          ) : null}

          <PressableLink
            href={`/v/${tagUuid}/hochladen?mode=scan`}
            variant="pill"
            nav="none"
            className="block text-center text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
          >
            Ohne OCR · Perspektiv-Zuschnitt
          </PressableLink>
        </div>
      ) : null}

      {step === "extracting" ? (
        <div
          className="vd-anim-header space-y-4 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-[0.9rem] text-[color:var(--vd-text)]">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            {progress.label}
          </div>
          {progress.page && progress.totalPages ? (
            <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
              Seite {progress.page} von {progress.totalPages} wird verarbeitet…
            </p>
          ) : null}
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-neutral-900 transition-[width] duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-[1.2rem]" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      ) : null}

      {isAbeReview && previewUrl && uploadFile ? (
        <ABEOverview
          previewUrl={previewUrl}
          previewKind={isPdfFile(uploadFile) ? "pdf" : "image"}
          pageCount={pageCount}
          rawText={rawText}
          initialFields={abeInitialFields}
          // Soft refine (no skeleton flicker) so Auflagen are filled completely.
          autoExtract
          isSaving={pending}
          saveError={error}
          onCancel={resetWizard}
          onSave={saveAbeDocument}
        />
      ) : null}

      {step === "review" && previewUrl && uploadFile && fields.category !== "abe" ? (
        <form
          className="vd-anim-header space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            const resolvedTitle = title.trim();
            if (!resolvedTitle) {
              setError("Titel ist erforderlich.");
              return;
            }

            startTransition(async () => {
              const oil = detectOilChangeInvoice({
                title: resolvedTitle,
                summary: resolvedTitle,
                vendor: fields.vendor,
                category: fields.category,
                notes: fields.notes,
                lineItems: fields.lineItems,
                rawText,
              });
              const oilPrimary = isPrimaryOilChange({
                summary: resolvedTitle,
                vendor: fields.vendor,
                category: fields.category,
                lineItems: fields.lineItems,
                rawText,
                oil,
              });

              const category = oilPrimary ? "service" : fields.category;
              const storedTitle = buildInvoiceDashboardTitle({
                summary: resolvedTitle,
                vendor: fields.vendor,
                category,
                lineItems: fields.lineItems,
                rawText,
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
                fields.lineItems?.length
                  ? JSON.stringify(fields.lineItems)
                  : "",
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
              formData.set(
                "invoiceNumber",
                fields.invoiceNumber?.trim() ?? "",
              );
              formData.set(
                "mileageKm",
                fields.mileageKm === null || fields.mileageKm === undefined
                  ? ""
                  : String(fields.mileageKm),
              );
              formData.set("pageCount", String(pageCount || 1));
              formData.set(
                "approvalFields",
                category === "tuev" && approvalFields?.kind === "tuev"
                  ? JSON.stringify(approvalFields)
                  : "",
              );
              formData.set("file", uploadFile);

              const result = await uploadDocument(formData);
              if (result.status === "error") {
                setError(result.message);
                return;
              }

              // Primary oil jobs open Intervalle; otherwise structured detail.
              const href = oilPrimary
                ? `/v/${result.tagUuid}/intervalle`
                : (successHref ??
                  `/v/${result.tagUuid}/dokumente/${result.document.id}`);
              window.location.assign(href);
            });
          }}
        >
          <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Dokumentvorschau"
              className="max-h-[36vh] w-full object-contain bg-neutral-100"
            />
            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--vd-border)] px-3 py-2.5 text-[0.75rem] text-[color:var(--vd-muted)]">
              <span>
                {pageCount > 1 ? `${pageCount} Seiten` : "1 Seite"} ·{" "}
                {formatBytes(uploadFile.size)}
              </span>
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex items-center gap-1 font-medium text-[color:var(--vd-text)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Neu
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
            {(() => {
              const oil = detectOilChangeInvoice({
                title,
                summary: title,
                vendor: fields.vendor,
                category: fields.category,
                notes: fields.notes,
                lineItems: fields.lineItems,
                rawText,
              });
              if (!oil.isOilChange) return null;
              const primary = isPrimaryOilChange({
                summary: title,
                vendor: fields.vendor,
                category: fields.category,
                lineItems: fields.lineItems,
                rawText,
                oil,
              });
              return (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-[0.82rem] text-emerald-800">
                  {primary ? (
                    <>
                      Ölwechsel ist die Hauptarbeit — Titel & Speicherung unter{" "}
                      <span className="font-semibold">Intervalle</span>.
                    </>
                  ) : (
                    <>
                      Ölwechsel als Nebenposition erkannt — bleibt unter{" "}
                      <span className="font-semibold">Intervalle</span>, Titel
                      beschreibt die Hauptarbeit.
                    </>
                  )}
                </div>
              );
            })()}

            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Titel / Summary
              </span>
              <Input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  resolvedCategory === "service"
                    ? "z. B. Inspektion 60.000 km"
                    : "z. B. Ölwechsel + Filter"
                }
              />
            </Label>

            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Anbieter
              </span>
              <Input
                value={fields.vendor ?? ""}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    vendor: event.target.value || null,
                  }))
                }
                placeholder="Werkstatt / Händler"
              />
            </Label>

            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Rechnungsnummer
              </span>
              <Input
                value={fields.invoiceNumber ?? ""}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    invoiceNumber: event.target.value || null,
                  }))
                }
                placeholder="z. B. RE-2026-0312"
              />
            </Label>

            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Kilometerstand
              </span>
              <Input
                inputMode="numeric"
                value={
                  fields.mileageKm === null || fields.mileageKm === undefined
                    ? ""
                    : String(fields.mileageKm)
                }
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d]/g, "");
                  if (!raw) {
                    setFields((current) => ({ ...current, mileageKm: null }));
                    return;
                  }
                  const value = Number.parseInt(raw, 10);
                  setFields((current) => ({
                    ...current,
                    mileageKm: Number.isFinite(value) ? value : current.mileageKm,
                  }));
                }}
                placeholder="z. B. 67210"
              />
            </Label>

            <Label>
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Kategorie
              </span>
              {resolvedLockCategory ? (
                <Input
                  readOnly
                  value={CATEGORY_LABELS[fields.category]}
                  className="bg-neutral-50"
                />
              ) : (
                <select
                  value={fields.category}
                  onChange={(event) => {
                    const category = event.target
                      .value as InvoiceTextParseCategory;
                    setFields((current) => ({
                      ...current,
                      category,
                      amount: category === "abe" ? null : current.amount,
                    }));
                  }}
                  className="claim-input"
                >
                  {INVOICE_TEXT_PARSE_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {CATEGORY_LABELS[option]}
                    </option>
                  ))}
                </select>
              )}
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
                      setFields((current) => ({ ...current, amount: null }));
                      return;
                    }
                    const normalized = raw.replace(",", ".");
                    const value = Number.parseFloat(normalized);
                    setFields((current) => ({
                      ...current,
                      amount: Number.isFinite(value) ? value : current.amount,
                    }));
                  }}
                  placeholder="optional"
                />
              </Label>
              <Label>
                <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                  Datum
                </span>
                <Input
                  type="date"
                  value={fields.date ?? ""}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      date: event.target.value || null,
                    }))
                  }
                />
              </Label>
            </div>

            {rawText ? (
              <details className="rounded-xl bg-neutral-50 px-3 py-2 text-left">
                <summary className="cursor-pointer text-[0.78rem] font-medium text-[color:var(--vd-muted)]">
                  Erkannten Text anzeigen ({rawText.length} Zeichen)
                </summary>
                <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[0.7rem] text-[color:var(--vd-text)]">
                  {rawText}
                </p>
              </details>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="claim-cta">
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
