/**
 * Client-side document prep for Azure Document Intelligence.
 * Images: A4-crop + compress for storage; always assemble PDF for Supabase.
 */

import { convertImagesToPdf } from "@/lib/utils/pdf-converter";

import {
  compressPageImage,
  type CompressedPage,
  revokeCompressedPages,
} from "./compress-page";
import {
  prepareClientOcrFilesDetailed,
  resolveClientOcrMaxPages,
} from "./prepare-client-ocr-file";

export type ProcessorProgress = {
  label: string;
  /** 0–100 */
  percent: number;
  page?: number;
  totalPages?: number;
};

export type ProcessInvoiceInput =
  | { kind: "images"; pages: CompressedPage[] }
  | {
      kind: "pdf";
      file: File;
      documentType?: "invoice" | "abe" | "tuev";
      approvalKind?: string | null;
    };

export type ProcessInvoiceResult = {
  /** A4-compressed page file(s) (or native PDF) for Document Intelligence. */
  analyzeFiles: File[];
  /** PDF file stored in Supabase after review; null until built for image scans. */
  uploadFile: File | null;
  /** Preview object URL for the review step. */
  previewUrl: string;
  /** Whether the caller must revoke `previewUrl`. */
  previewUrlOwned: boolean;
  /** How to render `previewUrl` — independent of `uploadFile` MIME type. */
  previewKind: "pdf" | "image";
  pageCount: number;
  sourceKind: "images" | "pdf";
  /** Set when `sourceKind === "pdf"` — total pages in the file. */
  pdfPageCount?: number;
  /** Pages successfully rasterized for OCR (may be less than `pdfPageCount`). */
  rasterizedPages?: number;
};

export class ProcessorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcessorError";
  }
}

function pageToAnalyzeFile(page: CompressedPage, index: number): File {
  return new File([page.blob], page.sourceName || `scan-${index + 1}-a4.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * A4-crop + compress an image page for OCR.
 */
export async function ingestImageFile(file: File): Promise<CompressedPage> {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new ProcessorError("Nur Bilddateien können als Seiten hinzugefügt werden.");
  }
  return compressPageImage(file);
}

/**
 * Prepare analyze files + PDF upload file from compressed pages or a native PDF.
 */
export async function processInvoiceDocuments(
  input: ProcessInvoiceInput,
  onProgress?: (progress: ProcessorProgress) => void,
): Promise<ProcessInvoiceResult> {
  if (input.kind === "pdf") {
    return processNativePdf(input.file, onProgress, {
      documentType: input.documentType ?? "invoice",
      approvalKind: input.approvalKind ?? null,
    });
  }
  return processImagePages(input.pages, onProgress);
}

/**
 * Assemble a storage PDF from compressed page blobs (deferred until after OCR).
 */
export async function buildUploadPdfFromPages(
  pages: CompressedPage[],
): Promise<File> {
  if (pages.length === 0) {
    throw new ProcessorError("Bitte mindestens eine Seite hinzufügen.");
  }

  const pdf = await convertImagesToPdf(
    pages.map((page) => page.blob),
    {
      fileName: `scan-${Date.now()}`,
      marginMm: 0,
      imageCompression: "MEDIUM",
    },
  );

  return pdf.file;
}

async function processImagePages(
  pages: CompressedPage[],
  onProgress?: (progress: ProcessorProgress) => void,
): Promise<ProcessInvoiceResult> {
  if (pages.length === 0) {
    throw new ProcessorError("Bitte mindestens eine Seite hinzufügen.");
  }

  const totalPages = pages.length;
  const analyzeFiles = pages.map((page, index) => pageToAnalyzeFile(page, index));

  onProgress?.({
    label: "Dokument vorbereitet",
    percent: 70,
    totalPages,
  });

  return {
    analyzeFiles,
    uploadFile: null,
    previewUrl: pages[0].previewUrl,
    previewUrlOwned: false,
    previewKind: "image",
    pageCount: totalPages,
    sourceKind: "images",
  };
}

async function processNativePdf(
  file: File,
  onProgress?: (progress: ProcessorProgress) => void,
  routing: {
    documentType: "invoice" | "abe" | "tuev";
    approvalKind: string | null;
  } = { documentType: "invoice", approvalKind: null },
): Promise<ProcessInvoiceResult> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new ProcessorError("Nur PDF-Dateien sind als native Uploads erlaubt.");
  }

  onProgress?.({ label: "PDF wird geladen…", percent: 12 });

  const maxPages = resolveClientOcrMaxPages({
    documentType: routing.documentType,
    approvalKind: routing.approvalKind,
  });

  let prepared;
  try {
    prepared = await prepareClientOcrFilesDetailed(file, {
      maxPages,
      onPageProgress: (page, total) => {
        const span = 55;
        const base = 15;
        onProgress?.({
          label: `Seite ${page} von ${total} wird vorbereitet…`,
          percent: Math.min(69, base + Math.round((page / total) * span)),
          page,
          totalPages: total,
        });
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "PDF konnte nicht in Seitenbilder umgewandelt werden.";
    throw new ProcessorError(message);
  }

  const { files: analyzeFiles, pdfPageCount, rasterizedPages } = prepared;

  const previewUrl = URL.createObjectURL(analyzeFiles[0]!);

  onProgress?.({
    label:
      pdfPageCount > rasterizedPages
        ? `Dokument vorbereitet (${rasterizedPages} von ${pdfPageCount} Seiten)`
        : "Dokument vorbereitet",
    percent: 70,
    totalPages: rasterizedPages,
  });

  return {
    analyzeFiles,
    uploadFile: file,
    previewUrl,
    previewUrlOwned: true,
    previewKind: "image",
    pageCount: rasterizedPages,
    sourceKind: "pdf",
    pdfPageCount,
    rasterizedPages,
  };
}

export { revokeCompressedPages };
