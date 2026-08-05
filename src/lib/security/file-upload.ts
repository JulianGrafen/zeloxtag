/**
 * Server-side file upload guards: size, declared MIME, and magic-byte sniffing.
 * Never trust client Content-Type alone.
 */

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  type AllowedDocumentMimeType,
} from "@/lib/documents/constants";

export type FileValidationSuccess = {
  ok: true;
  mime: AllowedDocumentMimeType;
  size: number;
  safeName: string;
};

export type FileValidationFailure = {
  ok: false;
  error: string;
};

const EXT_BY_MIME: Record<AllowedDocumentMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** Map extension → MIME for empty/incorrect browser types. */
const MIME_BY_EXT: Record<string, AllowedDocumentMimeType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function sanitizeUploadFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
}

/**
 * Detect MIME from file header bytes (executables / polyglots fail closed).
 */
export function sniffAllowedMime(
  bytes: Uint8Array,
): AllowedDocumentMimeType | null {
  if (bytes.length < 12) return null;

  // PDF: %PDF
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  // HEIC/HEIF (ISO BMFF) — ftyp + heic/heif/mif1/msf1
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(
      bytes[8] ?? 0,
      bytes[9] ?? 0,
      bytes[10] ?? 0,
      bytes[11] ?? 0,
    ).toLowerCase();
    if (brand === "heic" || brand === "heix" || brand === "hevc") {
      return "image/heic";
    }
    if (brand === "heif" || brand === "mif1" || brand === "msf1") {
      return "image/heif";
    }
  }

  // Reject PE / ELF / Mach-O / ZIP-as-exe camouflage early.
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) return null; // MZ
  if (
    bytes[0] === 0x7f &&
    bytes[1] === 0x45 &&
    bytes[2] === 0x4c &&
    bytes[3] === 0x46
  ) {
    return null; // ELF
  }

  return null;
}

function isAllowedMime(value: string): value is AllowedDocumentMimeType {
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * True for browser `File` or Node/Server-Action file-like Blobs with a name.
 * (`instanceof File` alone is unreliable across some SSR serialization paths.)
 */
export function isUploadFile(value: unknown): value is File {
  if (value instanceof File) return value.size > 0;
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    const named = value as Blob & { name?: unknown };
    return (
      value.size > 0 &&
      typeof named.name === "string" &&
      named.name.length > 0 &&
      typeof value.arrayBuffer === "function"
    );
  }
  return false;
}

/**
 * Validate an uploaded File (or File-like) before Storage / OCR.
 */
export async function validateDocumentUpload(
  file: File,
  options?: {
    maxBytes?: number;
    /** When true, only application/pdf is accepted. */
    pdfOnly?: boolean;
  },
): Promise<FileValidationSuccess | FileValidationFailure> {
  const maxBytes = options?.maxBytes ?? MAX_DOCUMENT_BYTES;

  if (!isUploadFile(file)) {
    return { ok: false, error: "Datei fehlt oder ist leer." };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `Datei zu groß (max. ${Math.round(maxBytes / (1024 * 1024))} MB).`,
    };
  }

  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const sniffed = sniffAllowedMime(header);
  const declared = (file.type || "").toLowerCase().trim();
  const extMime = MIME_BY_EXT[extensionOf(file.name)];

  // Magic bytes are mandatory — never trust declared MIME / extension alone.
  if (!sniffed || !isAllowedMime(sniffed)) {
    return {
      ok: false,
      error: "Dateityp nicht erkennbar oder nicht erlaubt (PDF, JPEG, PNG, WebP, HEIC).",
    };
  }

  if (declared && isAllowedMime(declared) && declared !== sniffed) {
    return {
      ok: false,
      error: "Dateityp stimmt nicht mit dem Dateiinhalt überein.",
    };
  }

  if (extMime && extMime !== sniffed) {
    return {
      ok: false,
      error: "Dateiendung stimmt nicht mit dem Dateiinhalt überein.",
    };
  }

  const resolved = sniffed;

  if (options?.pdfOnly && resolved !== "application/pdf") {
    return { ok: false, error: "Nur PDF-Dateien können gespeichert werden." };
  }

  const base = sanitizeUploadFilename(file.name || `document.${EXT_BY_MIME[resolved]}`);
  const expectedExt = EXT_BY_MIME[resolved];
  const safeName = base.toLowerCase().endsWith(`.${expectedExt}`)
    ? base
    : `${base.replace(/\.[^.]+$/, "")}.${expectedExt}`;

  return {
    ok: true,
    mime: resolved,
    size: file.size,
    safeName,
  };
}

/**
 * Extract `{vehicleId}/...` object path from a Supabase Storage URL.
 */
export function storagePathFromPublicOrAuthenticatedUrl(
  fileUrl: string,
  bucket: string,
): string | null {
  try {
    const url = new URL(fileUrl);
    const markers = [
      `/object/public/${bucket}/`,
      `/object/authenticated/${bucket}/`,
      `/object/sign/${bucket}/`,
    ];
    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(
          url.pathname.slice(idx + marker.length),
        );
        return path && !path.includes("..") ? path : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
