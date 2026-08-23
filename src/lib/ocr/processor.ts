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
import { loadPdfDocument } from "./pdf-source";

export type ProcessorProgress = {
  label: string;
  /** 0–100 */
  percent: number;
  page?: number;
  totalPages?: number;
};

export type ProcessInvoiceInput =
  | { kind: "images"; pages: CompressedPage[] }
  | { kind: "pdf"; file: File };

export type ProcessInvoiceResult = {
  /** A4-compressed page file(s) (or native PDF) for Document Intelligence. */
  analyzeFiles: File[];
  /** PDF file stored in Supabase after review. */
  uploadFile: File;
  /** Preview object URL for the review step. */
  previewUrl: string;
  /** Whether the caller must revoke `previewUrl`. */
  previewUrlOwned: boolean;
  /** How to render `previewUrl` — independent of `uploadFile` MIME type. */
  previewKind: "pdf" | "image";
  pageCount: number;
  sourceKind: "images" | "pdf";
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
    return processNativePdf(input.file, onProgress);
  }
  return processImagePages(input.pages, onProgress);
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
    label: "A4-PDF für Speicherung wird erzeugt…",
    percent: 55,
    totalPages,
  });

  const pdf = await convertImagesToPdf(
    pages.map((page) => page.blob),
    {
      fileName: `scan-${Date.now()}`,
      marginMm: 0,
      imageCompression: "MEDIUM",
    },
  );

  onProgress?.({
    label: "Dokument vorbereitet",
    percent: 70,
    totalPages,
  });

  return {
    analyzeFiles,
    uploadFile: pdf.file,
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
): Promise<ProcessInvoiceResult> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new ProcessorError("Nur PDF-Dateien sind als native Uploads erlaubt.");
  }

  onProgress?.({ label: "PDF wird geladen…", percent: 20 });
  const pdf = await loadPdfDocument(file);
  const totalPages = pdf.numPages;

  onProgress?.({
    label: "Vorschau wird erzeugt…",
    percent: 45,
    totalPages,
  });

  const previewUrl = URL.createObjectURL(file);
  const pdfWithCleanup = pdf as { destroy?: () => Promise<void> };
  if (typeof pdfWithCleanup.destroy === "function") {
    await pdfWithCleanup.destroy();
  }

  onProgress?.({
    label: "Dokument vorbereitet",
    percent: 70,
    totalPages,
  });

  return {
    analyzeFiles: [file],
    uploadFile: file,
    previewUrl,
    previewUrlOwned: true,
    previewKind: "pdf",
    pageCount: totalPages,
    sourceKind: "pdf",
  };
}

export { revokeCompressedPages };
