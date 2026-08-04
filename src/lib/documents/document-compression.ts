/**
 * Client-side document prep for OCR / storage.
 * Images → browser-image-compression (Web Worker).
 * PDFs → size gate only (no raster compression).
 */

import imageCompression from "browser-image-compression";

/** Full HD long edge — enough for Azure OCR, avoids 4K payloads. */
export const OCR_IMAGE_MAX_EDGE_PX = 1920;

/** Target size per page image after compression. */
export const OCR_IMAGE_MAX_SIZE_MB = 1.5;

/** Native PDF hard cap (Document Intelligence / storage). */
export const OCR_PDF_MAX_BYTES = 10 * 1024 * 1024;

export const OCR_OUTPUT_IMAGE_TYPE = "image/jpeg" as const;

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
]);

export class DocumentCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentCompressionError";
  }
}

export type DocumentCompressionResult = {
  file: File;
  wasCompressed: boolean;
  originalBytes: number;
  outputBytes: number;
  kind: "image" | "pdf";
};

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImageFile(file: File): boolean {
  if (file.type && IMAGE_MIME.has(file.type.toLowerCase())) return true;
  return /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(file.name);
}

function outputFileName(originalName: string, extension: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "document";
  return `${base}.${extension}`;
}

async function compressImageFile(file: File): Promise<DocumentCompressionResult> {
  const originalBytes = file.size;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: OCR_IMAGE_MAX_SIZE_MB,
      maxWidthOrHeight: OCR_IMAGE_MAX_EDGE_PX,
      useWebWorker: true,
      fileType: OCR_OUTPUT_IMAGE_TYPE,
      initialQuality: 0.85,
      // Preserve legibility for invoice / ABE text.
      alwaysKeepResolution: false,
    });

    const output =
      compressed instanceof File
        ? compressed
        : new File(
            [compressed],
            outputFileName(file.name, "jpg"),
            {
              type: OCR_OUTPUT_IMAGE_TYPE,
              lastModified: Date.now(),
            },
          );

    const normalized =
      output.type === OCR_OUTPUT_IMAGE_TYPE
        ? output
        : new File([output], outputFileName(file.name, "jpg"), {
            type: OCR_OUTPUT_IMAGE_TYPE,
            lastModified: Date.now(),
          });

    return {
      file: normalized,
      wasCompressed: normalized.size < originalBytes || normalized !== file,
      originalBytes,
      outputBytes: normalized.size,
      kind: "image",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bildkompression fehlgeschlagen.";
    // HEIC unsupported in some browsers — reject clearly instead of uploading 4K raw.
    throw new DocumentCompressionError(
      `Bild konnte nicht optimiert werden: ${message}`,
    );
  }
}

function gatePdfFile(file: File): DocumentCompressionResult {
  if (file.size > OCR_PDF_MAX_BYTES) {
    throw new DocumentCompressionError(
      `PDF zu groß (max. ${Math.round(OCR_PDF_MAX_BYTES / (1024 * 1024))} MB).`,
    );
  }

  return {
    file,
    wasCompressed: false,
    originalBytes: file.size,
    outputBytes: file.size,
    kind: "pdf",
  };
}

/**
 * Compress a single document file for OCR / upload.
 */
export async function compressDocumentFile(
  file: File,
): Promise<DocumentCompressionResult> {
  if (isPdfFile(file)) {
    return gatePdfFile(file);
  }

  if (isImageFile(file)) {
    return compressImageFile(file);
  }

  throw new DocumentCompressionError(
    "Nur PDF oder Bilder (JPEG, PNG, WebP, HEIC) werden unterstützt.",
  );
}

/**
 * Compress many files sequentially (keeps memory predictable on mobile).
 */
export async function compressDocumentFiles(
  files: File[],
  onItem?: (index: number, total: number) => void,
): Promise<DocumentCompressionResult[]> {
  const results: DocumentCompressionResult[] = [];
  for (let index = 0; index < files.length; index += 1) {
    onItem?.(index + 1, files.length);
    results.push(await compressDocumentFile(files[index]));
  }
  return results;
}
