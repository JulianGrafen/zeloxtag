"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  FileText,
  Info,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { ABEOverview } from "@/components/dashboard/ABEOverview";
import { EinzelabnahmeOverview } from "@/components/dashboard/EinzelabnahmeOverview";
import { TeilegutachtenOverview } from "@/components/dashboard/TeilegutachtenOverview";
import { TuevOverview } from "@/components/dashboard/TuevOverview";
import type { TeilegutachtenReviewFields } from "@/components/dashboard/TeilegutachtenOverview";
import type { TuevReviewFields } from "@/components/dashboard/TuevOverview";
import { technicalSpecsFromTeilegutachtenTable } from "@/lib/validations/teilegutachten-technical-data";
import { CameraCapture } from "@/components/documents/camera-capture";
import { GutachtenUploadWizard } from "@/components/documents/gutachten-upload-wizard";
import { VaultUploadWizard } from "@/components/documents/vault-upload-wizard";
import { AbeDataHunterWizard } from "@/components/documents/AbeDataHunterWizard";
import { InvoiceCaptureWizard } from "@/components/documents/invoice-capture-wizard";
import { TuevUploadWizard } from "@/components/documents/tuev-upload-wizard";
import { BackNav } from "@/components/layout/back-nav";
import { ScanContent } from "@/components/layout/scan-content";
import { Button } from "@/components/ui/button";
import { InvoiceReviewForm } from "@/components/documents/invoice-review-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { localDateIso, normalizeDocumentDateForUpload, normalizeDocumentDateIso } from "@/lib/documents/format";
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
import { assessVehicleDocumentMatch } from "@/lib/documents/vehicle-document-match";
import { validateMileageAgainstHistory } from "@/lib/documents/validate-mileage";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";
import { analyzeDocumentFiles } from "@/lib/ocr/analyze-document-client";
import {
  documentTypeForTextCategory,
  titleFromAbeFields,
} from "@/lib/ocr/category-map";
import {
  formatAbeKbaDisplay,
  normalizeAbeKbaDigits,
  type AbeMinimal,
  type AbeVehicleContext,
} from "@/lib/validations/abeSchema";
import type { CompressedPage } from "@/lib/ocr/compress-page";
import {
  buildUploadPdfFromPages,
  ingestImageFile,
  processInvoiceDocuments,
  revokeCompressedPages,
  type ProcessorProgress,
} from "@/lib/ocr/processor";
import {
  type InvoiceTextParseCategory,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import type { Document } from "@/types/database";

import {
  invoiceReviewCategoryFromScanType,
  normalizeInvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";
import { isThinInvoiceExtraction } from "@/lib/documents/invoice-extraction-thin";

const MAX_PAGES = 12;

type WizardStep = "compose" | "extracting" | "review";

interface InvoiceUploaderProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  /** Garage make — enables ABE Verwendungsbereich match when set with model. */
  vehicleMake?: string | null;
  /** Garage model — enables ABE Verwendungsbereich match when set with make. */
  vehicleModel?: string | null;
  /** Optional type code / EG-BE for tighter ABE matching. */
  vehicleTypeCode?: string | null;
  vehicleEgBe?: string | null;
  /** Garage VIN — §21 Einzelabnahme Field E verification. */
  vehicleVin?: string | null;
  /** Override back navigation target (default: documents list). */
  backHref?: string;
  backLabel?: string;
  /** Prefer in-page back when scanner is embedded on the dashboard. */
  onBack?: () => void;
  /** Prefill / lock OCR category (e.g. service for Inspektionen). */
  initialCategory?: InvoiceTextParseCategory;
  lockCategory?: boolean;
  /** Explicit scan intent from type picker — required before capture. */
  scanType: ScanType;
  /** After free scan save, redirect to dashboard upsell instead of document list. */
  useFreeScanSaveRedirect?: boolean;
  /** After successful save (default: documents list for that type). */
  successHref?: string;
  /** Existing vehicle documents — used for client-side mileage plausibility checks. */
  existingDocuments?: Document[];
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

function savedDocumentHref(
  tagUuid: string,
  documentId: string,
  successHref?: string,
): string {
  const base = successHref ?? `/v/${tagUuid}/dokumente/${documentId}`;
  return base.includes("?") ? `${base}&saved=1` : `${base}?saved=1`;
}

function savedInvoiceListHref(tagUuid: string, documentId: string): string {
  const params = new URLSearchParams({
    type: "invoice",
    saved: "1",
    highlight: documentId,
  });
  return `/v/${tagUuid}/dokumente?${params.toString()}`;
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
function buildVehicleContext(input: {
  make?: string | null;
  model?: string | null;
  typeCode?: string | null;
  egBe?: string | null;
}): AbeVehicleContext | null {
  const brand = input.make?.trim() ?? "";
  const model = input.model?.trim() ?? "";
  if (!brand || !model) return null;
  return {
    brand,
    model,
    ...(input.typeCode?.trim()
      ? { type: input.typeCode.trim() }
      : {}),
    ...(input.egBe?.trim() ? { egBe: input.egBe.trim() } : {}),
  };
}

export function InvoiceUploader({
  vehicleId,
  tagUuid,
  vehicleLabel,
  vehicleMake = null,
  vehicleModel = null,
  vehicleTypeCode = null,
  vehicleEgBe = null,
  vehicleVin = null,
  backHref,
  backLabel = "Zurück",
  onBack,
  initialCategory = "service",
  lockCategory = false,
  scanType,
  useFreeScanSaveRedirect = false,
  successHref,
  existingDocuments = [],
  heading = "Rechnung scannen",
  subheading,
}: InvoiceUploaderProps) {
  const vehicleContext = useMemo(
    () =>
      buildVehicleContext({
        make: vehicleMake,
        model: vehicleModel,
        typeCode: vehicleTypeCode,
        egBe: vehicleEgBe,
      }),
    [vehicleMake, vehicleModel, vehicleTypeCode, vehicleEgBe],
  );
  const scanDef = scanTypeDefinition(scanType);
  const resolvedCategory = scanDef.category ?? initialCategory;
  const resolvedLockCategory = scanDef.lockCategory ?? lockCategory;
  const defaultReviewCategory = invoiceReviewCategoryFromScanType(scanType);
  const resolvedHeading = scanDef.heading ?? heading;
  const resolvedSubheading = `${vehicleLabel} · ${scanDef.subheading}`;
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
  const [previewKind, setPreviewKind] = useState<"pdf" | "image">("image");
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
  const [vehicleMismatchReason, setVehicleMismatchReason] = useState<
    string | null
  >(null);
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);
  const [showThinPositionsHint, setShowThinPositionsHint] = useState(false);

  const mileageWarning = useMemo(() => {
    const km = fields.mileageKm;
    if (km === null || km <= 0 || existingDocuments.length === 0) {
      return null;
    }
    const check = validateMileageAgainstHistory(
      km,
      normalizeDocumentDateIso(fields.date),
      existingDocuments,
    );
    return check.ok ? null : check.warning;
  }, [existingDocuments, fields.date, fields.mileageKm]);

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
    setPreviewKind("image");
    setPreviewOwned(false);
    setUploadFile(null);
    setPageCount(0);
    setRawText("");
    setApprovalFields(null);
    setFields(emptyFields(resolvedCategory));
    setTitle("");
    setError(null);
    setVehicleMismatchReason(null);
    setDuplicateHint(null);
    setShowThinPositionsHint(false);
  }

  function buildInvoiceSaveValues(resolvedTitle: string) {
    const category = fields.category;
    const storedType = isInvoiceFamilyScan
      ? scanDef.documentType
      : documentTypeForTextCategory(category);

    return {
      type: storedType,
      typeLabel: DOCUMENT_TYPE_LABELS[storedType] ?? storedType,
      title: resolvedTitle,
      vendor: fields.vendor?.trim() ?? "",
      date: normalizeDocumentDateForUpload(fields.date),
      amount: fields.amount,
      mileageKm: fields.mileageKm,
      vehicleLabel,
    };
  }

  function attemptSaveInvoice(
    resolvedTitle: string,
    forceVehicle = false,
    forceMileage = false,
    forceDuplicate = false,
  ) {
    const match = assessVehicleDocumentMatch({
      rawText,
      garageVin: vehicleVin,
      garageMake: vehicleMake,
      garageModel: vehicleModel,
    });

    if (match.mismatch && !forceVehicle) {
      setVehicleMismatchReason(match.reason);
      setError(match.reason);
      return;
    }

    if (mileageWarning && !forceMileage) {
      setError(mileageWarning);
      return;
    }

    setVehicleMismatchReason(null);
    if (forceDuplicate) {
      setDuplicateHint(null);
    }
    persistGenericInvoiceFromConfirm(
      buildInvoiceSaveValues(resolvedTitle),
      forceVehicle,
      forceMileage,
      forceDuplicate,
    );
  }

  function persistGenericInvoiceFromConfirm(
    values: ReturnType<typeof buildInvoiceSaveValues>,
    assignDespiteMismatch = false,
    forceMileageSave = false,
    forceDuplicateSave = false,
  ) {
    setError(null);
    if (assignDespiteMismatch) {
      setVehicleMismatchReason(null);
    }
    if (!forceDuplicateSave) {
      setDuplicateHint(null);
    }

    startTransition(async () => {
      const category = fields.category;
      const storedTitle = values.title.trim().slice(0, 160);
      const storedType = values.type;

      if (!uploadFile) {
        setError("Keine Datei zum Speichern.");
        return;
      }

      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
      formData.set("type", storedType);
      formData.set("category", category);
      formData.set("vendor", values.vendor.trim());
      formData.set("date", values.date ?? "");
      formData.set(
        "amount",
        values.amount === null || values.amount === undefined
          ? ""
          : String(values.amount),
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
        fields.notes?.trim() ?? "",
      );
      formData.set("manufacturer", "");
      formData.set("invoiceNumber", fields.invoiceNumber?.trim() ?? "");
      formData.set(
        "mileageKm",
        values.mileageKm === null || values.mileageKm === undefined
          ? ""
          : String(values.mileageKm),
      );
      formData.set("pageCount", String(pageCount || 1));
      formData.set(
        "approvalFields",
        category === "tuev" && approvalFields?.kind === "tuev"
          ? JSON.stringify(approvalFields)
          : "",
      );
      if (assignDespiteMismatch) {
        formData.set("forceVehicleAssign", "1");
      }
      if (forceMileageSave) {
        formData.set("forceMileageSave", "1");
      }
      if (forceDuplicateSave) {
        formData.set("forceDuplicateSave", "1");
      }
      formData.set("file", uploadFile);

      try {
        const result = await uploadDocument(formData);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        if (result.status === "duplicate") {
          setDuplicateHint(result.message);
          return;
        }

        if (useFreeScanSaveRedirect && result.freeScanConsumed) {
          window.location.assign(`/v/${result.tagUuid}?freeScanWelcome=1`);
          return;
        }

        const isInvoiceSave = scanDef.ocrDocumentType === "invoice";
        const href = successHref
          ? savedDocumentHref(
              result.tagUuid,
              result.document.id,
              successHref,
            )
          : isInvoiceSave
            ? savedInvoiceListHref(result.tagUuid, result.document.id)
            : savedDocumentHref(result.tagUuid, result.document.id);
        window.location.assign(href);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Speichern fehlgeschlagen.",
        );
      }
    });
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
      setPages((current) => {
        const next = [...current, compressed];
        if (next.length > 1) {
          setShowThinPositionsHint(false);
        }
        return next;
      });
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

  async function completeInvoiceScan(files: File[]) {
    setError(null);
    setPagePrepBusy(true);
    setStep("extracting");
    setProgress({ label: "Vorbereitung…", percent: 4 });

    try {
      const optimized = await Promise.all(files.map((file) => compressFile(file)));

      const pdfEntry = optimized.find(
        (item) => item.kind === "pdf" || isPdfFile(item.file),
      );
      if (pdfEntry) {
        clearPages();
        setNativePdf(pdfEntry.file);
        await runExtraction({ nativePdf: pdfEntry.file, pages: [] });
        return;
      }

      const imageFiles = optimized.filter(
        (item) => item.kind !== "pdf" && !isPdfFile(item.file),
      );

      if (imageFiles.length === 0) {
        setError("Bitte mindestens eine Seite oder ein PDF hinzufügen.");
        setStep("compose");
        return;
      }

      if (imageFiles.length > MAX_PAGES) {
        setError(`Maximal ${MAX_PAGES} Seiten pro Beleg.`);
        setStep("compose");
        return;
      }

      const ingestedPages = await Promise.all(
        imageFiles.map((item) => ingestImageFile(item.file)),
      );

      if (nativePdf) setNativePdf(null);
      clearPages();
      setPages(ingestedPages);
      await runExtraction({ nativePdf: null, pages: ingestedPages });
    } catch (ingestError) {
      setStep("compose");
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
  const isGutachtenUpload = scanDef?.approvalKind === "gutachten";
  const isPlainAbeUpload = scanDef?.approvalKind === "abe";
  const isTuevUpload =
    scanDef?.ocrDocumentType === "tuev" ||
    (resolvedLockCategory && resolvedCategory === "tuev");
  const isVaultUpload = scanDef?.approvalKind === "vault";
  const isInvoiceFamilyScan = scanDef?.ocrDocumentType === "invoice";

  if (isVaultUpload) {
    return (
      <VaultUploadWizard
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        successHref={successHref}
        onBack={onBack}
        backHref={resolvedBackHref}
        backLabel={backLabel}
      />
    );
  }

  if (isTuevUpload) {
    return (
      <TuevUploadWizard
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        existingDocuments={existingDocuments}
        successHref={successHref}
        onBack={onBack}
        backHref={resolvedBackHref}
        backLabel={backLabel}
      />
    );
  }

  if (isGutachtenUpload) {
    return (
      <GutachtenUploadWizard
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        vehicleContext={vehicleContext}
        successHref={successHref}
        onBack={onBack}
        backHref={resolvedBackHref}
        backLabel={backLabel}
      />
    );
  }

  if (isPlainAbeUpload) {
    return (
      <AbeDataHunterWizard
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        vehicleContext={vehicleContext}
        successHref={successHref}
        onBack={onBack}
        backHref={resolvedBackHref}
        backLabel={backLabel}
        useFreeScanSaveRedirect={useFreeScanSaveRedirect}
      />
    );
  }

  const isEinzelabnahmeUpload = scanDef?.approvalKind === "einzelabnahme";
  const isTeilegutachtenUpload = scanDef?.approvalKind === "teilegutachten";
  const isGutachtenFamilyUpload = false;
  const isMultiPageGutachtenUpload = false;

  async function runExtraction(source?: {
    nativePdf?: File | null;
    pages?: CompressedPage[];
  }) {
    const pdf = source?.nativePdf !== undefined ? source.nativePdf : nativePdf;
    const imagePages = source?.pages ?? pages;

    setError(null);

    if (!pdf && imagePages.length === 0) {
      setError("Bitte mindestens eine Seite oder ein PDF hinzufügen.");
      return;
    }

    setStep("extracting");
    setProgress({ label: "Vorbereitung…", percent: 4 });

    try {
      const processed = await processInvoiceDocuments(
        pdf
          ? { kind: "pdf", file: pdf }
          : { kind: "images", pages: imagePages },
        setProgress,
      );

      const documentType = scanDef?.ocrDocumentType
        ? scanDef.ocrDocumentType
        : isAbeUpload
          ? "abe"
          : isTuevUpload
            ? "tuev"
            : "invoice";
      // ABE: combined PDF keeps multi-page tables in one parse call.
      // Invoice: always JPEG page(s) — client rasterizes PDFs to avoid server-side failures on Vercel.
      const analyzeFiles =
        documentType === "abe" && processed.uploadFile
          ? [processed.uploadFile]
          : documentType === "invoice"
            ? processed.analyzeFiles
            : processed.uploadFile
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
                  ? isEinzelabnahmeUpload
                    ? "Einzelabnahme wird analysiert…"
                    : isTeilegutachtenUpload
                      ? "Teilegutachten wird analysiert…"
                      : `${scanDef?.title ?? "Gutachten"} wird analysiert…`
                  : documentType === "tuev"
                    ? "TÜV-Bericht wird analysiert…"
                    : "Rechnung wird analysiert…",
            percent: Math.min(99, Math.round(70 + (page - 1) * span + span * 0.5)),
            page,
            totalPages,
          });
        },
        {
          vehicleId,
          documentType,
          approvalKind: scanDef?.approvalKind ?? null,
          vehicleContext:
            documentType === "abe" ? vehicleContext : null,
          garageVin:
            scanDef?.approvalKind === "einzelabnahme"
              ? vehicleVin ?? null
              : null,
          invoiceCategory:
            isInvoiceFamilyScan && resolvedLockCategory
              ? resolvedCategory
              : null,
        },
      );

      let uploadPdf = processed.uploadFile;
      if (!uploadPdf && processed.sourceKind === "images" && imagePages.length > 0) {
        setProgress({
          label: "PDF für Speicherung wird erzeugt…",
          percent: 96,
          totalPages: processed.pageCount,
        });
        uploadPdf = await buildUploadPdfFromPages(imagePages);
      }

      setUploadFile(uploadPdf);
      setPreviewUrl(processed.previewUrl);
      setPreviewKind(processed.previewKind);
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

      const baseFields = {
        ...analyzed.fields,
        date: normalizeDocumentDateIso(analyzed.fields.date),
        category: normalizeInvoiceReviewCategory(
          resolvedLockCategory ? resolvedCategory : analyzed.fields.category,
          defaultReviewCategory,
        ),
      };

      const nextFields =
        oil.isOilChange && !oilPrimary
          ? {
              ...baseFields,
              notes: baseFields.notes?.trim()
                ? `${baseFields.notes.trim()} · ${oil.notes}`
                : oil.notes,
            }
          : baseFields;
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

      const usedSingleOverviewScan =
        isInvoiceFamilyScan && !pdf && imagePages.length === 1;
      if (
        usedSingleOverviewScan &&
        isThinInvoiceExtraction({
          lineItems: nextFields.lineItems,
          amount: nextFields.amount,
        })
      ) {
        setShowThinPositionsHint(true);
        setStep("compose");
        return;
      }

      setShowThinPositionsHint(false);
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
  const isEinzelabnahmeReview =
    step === "review" &&
    isEinzelabnahmeUpload &&
    Boolean(previewUrl) &&
    Boolean(uploadFile);
  const isTeilegutachtenReview =
    step === "review" &&
    isTeilegutachtenUpload &&
    Boolean(previewUrl) &&
    Boolean(uploadFile);
  const isTuevReview =
    step === "review" &&
    isTuevUpload &&
    Boolean(previewUrl) &&
    Boolean(uploadFile);
  const isAbeReview =
    step === "review" &&
    !isEinzelabnahmeUpload &&
    !isTeilegutachtenUpload &&
    (fields.category === "abe" || isGutachtenFamilyUpload) &&
    Boolean(previewUrl) &&
    Boolean(uploadFile);

  async function startAbeAwareExtraction() {
    if (isMultiPageGutachtenUpload && !nativePdf && pages.length === 1) {
      const docLabel = isTeilegutachtenUpload
        ? "Teilegutachten"
        : (scanDef?.title ?? "Gutachten");
      const confirmed = window.confirm(
        `Du hast nur 1 Seite erfasst. ${docLabel} haben oft mehrere Seiten.\n\nBitte alle Seiten dieses Dokuments scannen.\nTrotzdem mit einer Seite fortfahren?`,
      );
      if (!confirmed) return;
    }
    if (isEinzelabnahmeUpload && !nativePdf && pages.length === 1) {
      const confirmed = window.confirm(
        "Du hast nur 1 Seite erfasst. Einzelabnahmen enthalten oft mehrere Seiten inkl. Feld 22.\n\nTrotzdem mit einer Seite fortfahren?",
      );
      if (!confirmed) return;
    }
    await runExtraction();
  }

  const abeInitialFields = useMemo((): Partial<AbeMinimal> => {
    const statusFromNotes = fields.notes?.match(
      /Fahrzeug-Check:\s*(verified|not_found|needs_manual_check)/i,
    )?.[1] as AbeMinimal["userVehicleMatchStatus"] | undefined;
    const rowFromNotes = fields.notes?.match(/Trefferzeile:\s*(.+)/i)?.[1]?.trim();
    return {
      kbaNumber: normalizeAbeKbaDigits(fields.kbaNumber),
      testingOrganization: fields.authority,
      manufacturer: fields.manufacturer,
      partCategory: fields.partCategory,
      partType: fields.vendor ?? fields.summary,
      userVehicleMatchStatus: statusFromNotes ?? null,
      matchedConditions: fields.conditions,
      matchedVehicleRow:
        rowFromNotes || fields.vehicleApprovals?.[0] || null,
    };
  }, [
    fields.kbaNumber,
    fields.authority,
    fields.manufacturer,
    fields.partCategory,
    fields.vendor,
    fields.summary,
    fields.notes,
    fields.conditions,
    fields.vehicleApprovals,
  ]);

  function saveEinzelabnahmeDocument(payload: {
    review: {
      documentNumber: string | null;
      issueDate: string | null;
      vin: string | null;
      manufacturer: string | null;
      model: string | null;
      officialExpert: string | null;
      mileageKm: number | null;
      modificationsField22: string | null;
      additionalRemarks: string | null;
      vinMatchesGarage: boolean | null;
    };
    approvalFields: Extract<ApprovalFields, { kind: "einzelabnahme" }>;
    title: string;
  }) {
    if (!uploadFile) {
      setError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    setError(null);
    const { review, approvalFields: approval, title: storedTitle } = payload;

    const notes = [
      review.modificationsField22
        ? `Feld 22:\n${review.modificationsField22}`
        : null,
      review.additionalRemarks
        ? `Zusätzliche Bemerkungen:\n${review.additionalRemarks}`
        : null,
      review.vinMatchesGarage === true
        ? "VIN (Feld E) stimmt mit Garage-Fahrzeug überein."
        : review.vinMatchesGarage === false
          ? "WARNUNG: VIN (Feld E) stimmt NICHT mit Garage-Fahrzeug überein."
          : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
      formData.set("type", "abe");
      formData.set("category", "abe");
      formData.set("vendor", review.model?.trim() ?? storedTitle);
      formData.set(
        "date",
        normalizeDocumentDateIso(review.issueDate) ?? localDateIso(),
      );
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", review.documentNumber?.trim() ?? "");
      formData.set(
        "vehicleApprovals",
        review.vin?.trim() ? JSON.stringify([`VIN ${review.vin.trim()}`]) : "",
      );
      formData.set("authority", "");
      formData.set(
        "conditions",
        review.modificationsField22?.trim()
          ? JSON.stringify([review.modificationsField22.trim().slice(0, 800)])
          : "",
      );
      formData.set("technicalSpecs", "");
      formData.set("partCategory", "");
      formData.set("notes", notes);
      formData.set("manufacturer", review.manufacturer?.trim() ?? "");
      formData.set("invoiceNumber", review.documentNumber?.trim() ?? "");
      formData.set(
        "mileageKm",
        review.mileageKm != null ? String(review.mileageKm) : "",
      );
      formData.set("pageCount", String(pageCount || 1));
      formData.set("approvalFields", JSON.stringify(approval));
      formData.set("file", uploadFile);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      const href = savedDocumentHref(
        result.tagUuid,
        result.document.id,
        successHref,
      );
      window.location.assign(href);
    });
  }

  function saveTeilegutachtenDocument(payload: {
    review: TeilegutachtenReviewFields;
    approvalFields: Extract<ApprovalFields, { kind: "teilegutachten" }>;
    title: string;
  }) {
    if (!uploadFile) {
      setError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    setError(null);
    const { review, approvalFields: approval, title: storedTitle } = payload;
    const certificateNumber = review.certificateNumber?.trim() ?? "";

    // Verwendungsbereich + Auflagen live in approval_fields / vehicle_approvals — keep notes short.
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

    startTransition(async () => {
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
        review.modificationType?.trim() ??
          review.partCategory?.trim() ??
          "",
      );
      formData.set("notes", notes);
      formData.set("manufacturer", review.manufacturer?.trim() ?? "");
      formData.set("invoiceNumber", certificateNumber);
      formData.set("mileageKm", "");
      formData.set("pageCount", String(pageCount || 1));
      formData.set("approvalFields", JSON.stringify(approval));
      formData.set("file", uploadFile);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      const href =
        successHref ?? `/v/${result.tagUuid}/dokumente/${result.document.id}`;
      window.location.assign(href);
    });
  }

  function saveTuevDocument(
    payload: {
      review: TuevReviewFields;
      approvalFields: Extract<ApprovalFields, { kind: "tuev" }>;
      title: string;
    },
    options?: { forceMileageSave?: boolean },
  ) {
    if (!uploadFile) {
      setError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    setError(null);
    const { review, approvalFields: approval, title: storedTitle } = payload;
    const vendorLabel =
      review.workshopName?.trim() ||
      (review.testingOrganization === "other"
        ? "Prüforganisation"
        : review.testingOrganization);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
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
      formData.set(
        "invoiceNumber",
        review.documentNumber?.trim() ?? "",
      );
      formData.set(
        "mileageKm",
        review.mileageKm === null ? "" : String(review.mileageKm),
      );
      formData.set("pageCount", String(pageCount || 1));
      formData.set("approvalFields", JSON.stringify(approval));
      if (options?.forceMileageSave) {
        formData.set("forceMileageSave", "1");
      }
      formData.set("file", uploadFile);

      const result = await uploadDocument(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      const href =
        successHref ?? `/v/${result.tagUuid}/dokumente/${result.document.id}`;
      window.location.assign(href);
    });
  }

  function saveAbeDocument(abe: AbeMinimal) {
    if (!uploadFile) {
      setError("Keine Datei zum Speichern vorhanden.");
      return;
    }

    setError(null);
    const partType = abe.partType?.trim() || null;
    const manufacturer = abe.manufacturer?.trim() || null;
    const storedTitle = titleFromAbeFields({
      manufacturer,
      partType,
      partCategory: abe.partCategory,
    });
    const kbaStored =
      formatAbeKbaDisplay(abe.kbaNumber) ?? abe.kbaNumber?.trim() ?? "";

    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle);
      formData.set("type", "abe");
      formData.set("category", "abe");
      // Keep Bauteil/Modell in vendor; list title is manufacturer + model.
      formData.set("vendor", partType ?? storedTitle);
      formData.set("date", localDateIso());
      formData.set("amount", "");
      formData.set("lineItems", "");
      formData.set("kbaNumber", kbaStored);
      formData.set(
        "vehicleApprovals",
        abe.matchedVehicleRow
          ? JSON.stringify([abe.matchedVehicleRow])
          : "",
      );
      formData.set(
        "authority",
        abe.testingOrganization?.trim() || fields.authority?.trim() || "",
      );
      formData.set(
        "conditions",
        abe.matchedConditions?.length
          ? JSON.stringify(abe.matchedConditions)
          : "",
      );
      formData.set("technicalSpecs", "");
      formData.set("partCategory", abe.partCategory?.trim() ?? "");
      const matchNotes = [
        abe.userVehicleMatchStatus
          ? `Fahrzeug-Check: ${abe.userVehicleMatchStatus}`
          : null,
        abe.matchedVehicleRow
          ? `Trefferzeile: ${abe.matchedVehicleRow}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      formData.set("notes", matchNotes || fields.notes?.trim() || "");
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
    <ScanContent
      wide={
        isAbeReview ||
        isEinzelabnahmeReview ||
        isTeilegutachtenReview ||
        isTuevReview
      }
      className="pb-12"
    >
      <header className="vd-anim-header space-y-4">
        {onBack ? (
          <BackNav label={backLabel} onClick={onBack} />
        ) : (
          <BackNav label={backLabel} href={resolvedBackHref} />
        )}

        {isInvoiceFamilyScan ? (
          <div className="px-1">
            <p className="claim-kicker">Dokument scannen</p>
            <h1 className="claim-title mt-1 text-[1.25rem]">{resolvedHeading}</h1>
            <p className="claim-copy mt-0.5 text-[0.8rem]">
              {resolvedSubheading ?? vehicleLabel}
            </p>
          </div>
        ) : (
          <div className="vd-surface-card p-5">
            <div className="vd-icon-badge">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <p className="claim-kicker mt-4">Dokument scannen</p>
            <h1 className="claim-title mt-2">{resolvedHeading}</h1>
            <p className="claim-copy mt-1">
              {resolvedSubheading ?? `${vehicleLabel} · Beleg einlesen`}
            </p>
          </div>
        )}
      </header>

      {step === "compose" ? (
        <div className="vd-anim-header space-y-3">
          {!nativePdf && pages.length === 0 ? (
            isInvoiceFamilyScan ? (
              <InvoiceCaptureWizard
                title={resolvedHeading}
                scanLabel={scanDef?.title ?? "Beleg"}
                allowPdf
                disabled={compressing}
                onComplete={(files) => {
                  void completeInvoiceScan(files);
                }}
              />
            ) : (
              <CameraCapture
                allowPdf
                disabled={compressing}
                hint={
                  isEinzelabnahmeUpload
                    ? "Einzelabnahme fotografieren oder als PDF hochladen"
                    : isTeilegutachtenUpload
                      ? "Teilegutachten fotografieren oder als PDF hochladen"
                      : isGutachtenFamilyUpload
                        ? `Alle Seiten von ${scanDef?.title ?? "Gutachten"} fotografieren oder als PDF hochladen`
                        : isTuevUpload
                          ? "TÜV-/HU-Bericht fotografieren oder als PDF hochladen"
                          : "Foto wird automatisch auf A4 zugeschnitten und für OCR komprimiert"
                }
                onFileSelected={(file) => {
                  void handleIncomingFile(file);
                }}
              />
            )
          ) : null}

          {isEinzelabnahmeUpload ? (
            <div
              role="note"
              className="rounded-[1.35rem] border border-sky-300/70 bg-sky-50 px-4 py-3.5 text-[0.84rem] leading-relaxed text-sky-950 shadow-[var(--vd-shadow-sm)]"
            >
              <div className="flex items-start gap-2.5">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-sky-800"
                  aria-hidden
                />
                <div className="space-y-1.5">
                  <p className="font-semibold tracking-[-0.01em]">
                    Einzelbetriebserlaubnis § 21 — nur für dieses Fahrzeug
                  </p>
                  <p>
                    Das Dokument ist an die{" "}
                    <span className="font-medium">Fahrgestellnummer (Feld E)</span>{" "}
                    gebunden. Bitte{" "}
                    <span className="font-medium">alle Seiten</span> scannen —
                    besonders{" "}
                    <span className="font-medium">Feld 22 (Bemerkungen)</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isTeilegutachtenUpload ? (
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
                    Teilegutachten — Gutachtennummer, nicht KBA
                  </p>
                  <p>
                    Wir lesen die{" "}
                    <span className="font-medium">Teilegutachten-Nr.</span>,
                    Kennzeichnung und den Verwendungsbereich. Bitte{" "}
                    <span className="font-medium">alle Seiten</span> scannen.
                    Für die Straße brauchst du zusätzlich eine Anbauabnahme.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isGutachtenFamilyUpload ? (
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

              {showThinPositionsHint && isInvoiceFamilyScan && pages.length === 1 ? (
                <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-3 text-[0.82rem] leading-relaxed text-amber-950">
                  <p className="font-semibold">Wenige Positionen erkannt</p>
                  <p className="mt-1">
                    Noch ein Foto vom Positionsblock (Pos · Menge · Preise)
                    verbessert die Erkennung — oder fahre mit den erkannten
                    Daten fort.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowThinPositionsHint(false);
                      setStep("review");
                    }}
                    className="mt-3 w-full rounded-xl border border-amber-300/80 bg-white px-3 py-2.5 text-[0.82rem] font-semibold text-amber-950"
                  >
                    Weiter zur Prüfung
                  </button>
                </div>
              ) : null}

              {pages.length < MAX_PAGES ? (
                <div className="grid grid-cols-1 gap-2">
                  {isInvoiceFamilyScan ? (
                    <InvoiceCaptureWizard
                      variant="add-page"
                      title={resolvedHeading}
                      scanLabel={scanDef?.title ?? "Beleg"}
                      disabled={compressing}
                      imageButtonLabel="Bild hinzufügen"
                      cameraButtonLabel={
                        showThinPositionsHint
                          ? "Positionen fotografieren"
                          : "Rechnungsblock · Kamera"
                      }
                      onFileSelected={(file) => {
                        void handleIncomingFile(file);
                      }}
                    />
                  ) : (
                    <CameraCapture
                      disabled={compressing}
                      label="Weitere Seite"
                      hint={
                        isEinzelabnahmeUpload
                          ? "Nächste Seite derselben Einzelabnahme hinzufügen"
                          : isTeilegutachtenUpload
                            ? "Nächste Seite desselben Teilegutachtens hinzufügen"
                            : isGutachtenFamilyUpload
                              ? "Nächste Seite desselben Gutachtens hinzufügen"
                              : "Nächste Seite fotografieren oder aus der Galerie wählen"
                      }
                      imageButtonLabel="Bild hinzufügen"
                      cameraButtonLabel="Kamera · Seite hinzufügen"
                      onFileSelected={(file) => {
                        void handleIncomingFile(file);
                      }}
                    />
                  )}
                  <p className="text-center text-[0.75rem] text-[color:var(--vd-muted)]">
                    <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    {isEinzelabnahmeUpload
                      ? `Weitere Seite derselben Einzelabnahme · max. ${MAX_PAGES}`
                      : isTeilegutachtenUpload
                        ? `Weitere Seite desselben Teilegutachtens · max. ${MAX_PAGES}`
                        : isGutachtenFamilyUpload
                      ? `Weitere Seite desselben Gutachtens · max. ${MAX_PAGES}`
                      : `Weitere Seite hinzufügen · max. ${MAX_PAGES}`}
                  </p>
                </div>
              ) : null}

              {isEinzelabnahmeUpload && pages.length === 1 ? (
                <p className="rounded-xl bg-sky-50 px-3 py-2 text-[0.78rem] text-sky-950">
                  Nur 1 Seite erfasst — fehlen noch Seiten inkl. Feld 22? Bitte
                  alle Seiten der Einzelabnahme hinzufügen.
                </p>
              ) : null}

              {isTeilegutachtenUpload && pages.length === 1 ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-950">
                  Nur 1 Seite erfasst — fehlen noch Seiten dieses Teilegutachtens?
                  Bitte alle Seiten hinzufügen.
                </p>
              ) : null}

              {isGutachtenFamilyUpload && pages.length === 1 ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-950">
                  Nur 1 Seite erfasst — fehlen noch Seiten dieses Gutachtens?
                  Bitte alle Seiten hinzufügen.
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
            <p role="alert" className="vd-alert-error">
              {error}
            </p>
          ) : null}
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

      {isEinzelabnahmeReview && previewUrl && uploadFile ? (
        <EinzelabnahmeOverview
          previewUrl={previewUrl}
          previewKind={previewKind}
          pageCount={pageCount}
          fields={fields}
          approvalFields={approvalFields}
          garageVin={vehicleVin}
          isSaving={pending}
          saveError={error}
          onCancel={resetWizard}
          onSave={saveEinzelabnahmeDocument}
        />
      ) : null}

      {isTeilegutachtenReview && previewUrl && uploadFile ? (
        <TeilegutachtenOverview
          previewUrl={previewUrl}
          previewKind={previewKind}
          pageCount={pageCount}
          fields={fields}
          approvalFields={approvalFields}
          isSaving={pending}
          saveError={error}
          onCancel={resetWizard}
          onSave={saveTeilegutachtenDocument}
        />
      ) : null}

      {isTuevReview && previewUrl && uploadFile ? (
        <TuevOverview
          previewUrl={previewUrl}
          previewKind={previewKind}
          pageCount={pageCount}
          fields={fields}
          approvalFields={approvalFields}
          existingDocuments={existingDocuments}
          isSaving={pending}
          saveError={error}
          onCancel={resetWizard}
          onSave={saveTuevDocument}
        />
      ) : null}

      {isAbeReview && previewUrl && uploadFile ? (
        <ABEOverview
          vehicleId={vehicleId}
          previewUrl={previewUrl}
          previewKind={previewKind}
          pageCount={pageCount}
          rawText={rawText}
          initialFields={abeInitialFields}
          vehicleContext={vehicleContext}
          autoExtract
          isSaving={pending}
          saveError={error}
          onCancel={resetWizard}
          onSave={saveAbeDocument}
        />
      ) : null}

      {step === "review" &&
      previewUrl &&
      uploadFile &&
      fields.category !== "abe" &&
      !isTuevReview ? (
        <div className="vd-anim-header">
          <InvoiceReviewForm
            title={title}
            onTitleChange={setTitle}
            fields={fields}
            onFieldsChange={(patch) =>
              setFields((current) => ({ ...current, ...patch }))
            }
            categoryLocked={Boolean(resolvedLockCategory)}
            vehicleMismatchReason={vehicleMismatchReason}
            mileageWarning={
              vehicleMismatchReason || duplicateHint ? null : mileageWarning
            }
            duplicateHint={duplicateHint}
            saving={pending}
            error={error}
            preview={{
              url: previewUrl,
              kind: previewKind,
              pageCount,
              fileSizeLabel: formatBytes(uploadFile.size),
            }}
            onReset={resetWizard}
            onSave={() => {
              setError(null);
              const resolvedTitle = title.trim();
              if (!resolvedTitle) {
                setError("Bezeichnung ist erforderlich.");
                return;
              }
              attemptSaveInvoice(resolvedTitle);
            }}
            onSaveDespiteMismatch={() => {
              setError(null);
              const resolvedTitle = title.trim();
              if (!resolvedTitle) {
                setError("Bezeichnung ist erforderlich.");
                return;
              }
              attemptSaveInvoice(resolvedTitle, true, true);
            }}
            onSaveDespiteMileage={() => {
              setError(null);
              const resolvedTitle = title.trim();
              if (!resolvedTitle) {
                setError("Bezeichnung ist erforderlich.");
                return;
              }
              attemptSaveInvoice(resolvedTitle, false, true);
            }}
            onSaveDespiteDuplicate={() => {
              setError(null);
              const resolvedTitle = title.trim();
              if (!resolvedTitle) {
                setError("Bezeichnung ist erforderlich.");
                return;
              }
              attemptSaveInvoice(resolvedTitle, true, true, true);
            }}
            onDismissMismatch={() => setVehicleMismatchReason(null)}
            onDismissDuplicate={() => setDuplicateHint(null)}
            topBanner={(() => {
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
              if (!primary) return null;
              return (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-[0.82rem] text-emerald-800">
                  Ölwechsel erkannt — der Beleg wird unter{" "}
                  <span className="font-semibold">Rechnungen</span> gespeichert.
                </div>
              );
            })()}
          />
        </div>
      ) : null}
    </ScanContent>
  );
}
