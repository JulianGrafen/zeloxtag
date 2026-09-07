/**
 * Client-side document prep for OCR / storage.
 * Images → browser-image-compression (Web Worker).
 * PDFs → size gate only (no raster compression).
 */

import imageCompression from "browser-image-compression";

import { resizeDocumentImage } from "@/lib/utils/image-optimizer";

/** Full HD long edge — enough for Azure OCR, avoids 4K payloads. */
export const OCR_IMAGE_MAX_EDGE_PX = 1920;

/** Target size per page image after compression. */
export const OCR_IMAGE_MAX_SIZE_MB = 1.5;

const OCR_IMAGE_MAX_BYTES = OCR_IMAGE_MAX_SIZE_MB * 1024 * 1024;

/** Native PDF hard cap — matches `/api/ocr/parse` body limit on Vercel (~4 MB). */
export const OCR_PDF_MAX_BYTES = 4 * 1024 * 1024;

/** Dyno PDF cap — leave headroom for multipart fields under Vercel's ~4.5 MB limit. */
export const DYNO_PDF_MAX_BYTES = Math.floor(4.2 * 1024 * 1024);

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

function isPdfMime(mime: string): boolean {
  const normalized = mime.trim().toLowerCase();
  return (
    normalized === "application/pdf" ||
    normalized === "application/x-pdf" ||
    normalized === "application/vnd.pdf"
  );
}

function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function isPdfFile(file: File): boolean {
  return isPdfMime(file.type) || file.name.toLowerCase().endsWith(".pdf");
}

function isImageFile(file: File): boolean {
  if (file.type && IMAGE_MIME.has(file.type.toLowerCase())) return true;
  return /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(file.name);
}

function outputFileName(originalName: string, extension: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "document";
  return `${base}.${extension}`;
}

function inferImageMime(bytes: Uint8Array, name: string, declaredType: string): string {
  if (declaredType.startsWith("image/")) return declaredType;

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand.startsWith("heic") || brand.startsWith("heif")) {
      return "image/heic";
    }
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return "image/webp";
  }

  const lower = name.toLowerCase();
  if (/\.jpe?g$/.test(lower)) return "image/jpeg";
  if (/\.png$/.test(lower)) return "image/png";
  if (/\.webp$/.test(lower)) return "image/webp";
  if (/\.heic$/.test(lower)) return "image/heic";
  if (/\.heif$/.test(lower)) return "image/heif";
  return "image/jpeg";
}

async function materializeImageFile(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength < 32) {
    throw new DocumentCompressionError(
      "Datei ist leer — bitte erneut auswählen.",
    );
  }

  const type = inferImageMime(bytes, file.name, file.type.trim().toLowerCase());
  return new File([bytes], file.name || "photo.jpg", {
    type,
    lastModified: Date.now(),
  });
}

function normalizeCompressedJpeg(
  compressed: File | Blob,
  originalName: string,
): File {
  const output =
    compressed instanceof File
      ? compressed
      : new File([compressed], outputFileName(originalName, "jpg"), {
          type: OCR_OUTPUT_IMAGE_TYPE,
          lastModified: Date.now(),
        });

  if (output.type === OCR_OUTPUT_IMAGE_TYPE) {
    return output;
  }

  return new File([output], outputFileName(originalName, "jpg"), {
    type: OCR_OUTPUT_IMAGE_TYPE,
    lastModified: Date.now(),
  });
}

async function compressImageWithCanvas(file: File): Promise<File> {
  const result = await resizeDocumentImage(file, {
    maxWidth: OCR_IMAGE_MAX_EDGE_PX,
    maxBytes: OCR_IMAGE_MAX_BYTES,
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    result.canvas.toBlob(resolve, OCR_OUTPUT_IMAGE_TYPE, 0.85);
  });

  if (!blob || blob.size < 32) {
    throw new DocumentCompressionError(
      "Bild konnte nicht als JPEG gespeichert werden.",
    );
  }

  return new File([blob], outputFileName(file.name, "jpg"), {
    type: OCR_OUTPUT_IMAGE_TYPE,
    lastModified: Date.now(),
  });
}

async function compressImageFile(file: File): Promise<DocumentCompressionResult> {
  const originalBytes = file.size;
  const materialized = await materializeImageFile(file);

  try {
    const compressed = await imageCompression(materialized, {
      maxSizeMB: OCR_IMAGE_MAX_SIZE_MB,
      maxWidthOrHeight: OCR_IMAGE_MAX_EDGE_PX,
      // Main-thread path — Web Workers fail on some mobile Safari / embedded builds.
      useWebWorker: false,
      fileType: OCR_OUTPUT_IMAGE_TYPE,
      initialQuality: 0.85,
      alwaysKeepResolution: false,
    });

    const normalized = normalizeCompressedJpeg(compressed, materialized.name);

    return {
      file: normalized,
      wasCompressed:
        normalized.size < originalBytes || normalized.size < materialized.size,
      originalBytes,
      outputBytes: normalized.size,
      kind: "image",
    };
  } catch (libraryError) {
    try {
      const fallback = await compressImageWithCanvas(materialized);
      return {
        file: fallback,
        wasCompressed: true,
        originalBytes,
        outputBytes: fallback.size,
        kind: "image",
      };
    } catch (fallbackError) {
      const message =
        fallbackError instanceof Error
          ? fallbackError.message
          : libraryError instanceof Error
            ? libraryError.message
            : "Bildkompression fehlgeschlagen.";
      throw new DocumentCompressionError(
        `Bild konnte nicht optimiert werden: ${message}`,
      );
    }
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

function pdfOutputName(originalName: string): string {
  const trimmed = originalName.trim();
  if (trimmed.toLowerCase().endsWith(".pdf")) return trimmed;
  const base = trimmed.replace(/\.[^.]+$/, "") || "leistungsdiagramm";
  return `${base}.pdf`;
}

/**
 * Prepare a dyno / Leistungsdiagramm upload: materialize bytes immediately,
 * compress images, pass PDFs through with a stable in-memory File.
 */
export async function prepareDynoChartFile(
  file: File,
): Promise<DocumentCompressionResult> {
  const originalBytes = file.size;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength < 32) {
    throw new DocumentCompressionError(
      "Datei ist leer — bitte erneut auswählen.",
    );
  }

  if (isPdfBytes(bytes) || isPdfFile(file)) {
    if (bytes.byteLength > DYNO_PDF_MAX_BYTES) {
      throw new DocumentCompressionError(
        `PDF zu groß (max. ${Math.round(DYNO_PDF_MAX_BYTES / (1024 * 1024))} MB).`,
      );
    }

    const normalized = new File([bytes], pdfOutputName(file.name), {
      type: "application/pdf",
      lastModified: Date.now(),
    });

    return {
      file: normalized,
      wasCompressed: false,
      originalBytes,
      outputBytes: normalized.size,
      kind: "pdf",
    };
  }

  if (isImageFile(file)) {
    const materialized = new File([bytes], file.name || "leistungsdiagramm.jpg", {
      type: file.type || "application/octet-stream",
      lastModified: Date.now(),
    });
    const compressed = await compressImageFile(materialized);
    const outputBytes = new Uint8Array(await compressed.file.arrayBuffer());
    const output = new File([outputBytes], compressed.file.name, {
      type: compressed.file.type,
      lastModified: Date.now(),
    });

    return {
      file: output,
      wasCompressed: compressed.wasCompressed,
      originalBytes,
      outputBytes: output.size,
      kind: "image",
    };
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
