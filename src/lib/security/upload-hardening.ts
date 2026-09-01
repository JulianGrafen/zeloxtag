/**
 * Upload hardening beyond magic bytes: polyglot stripping, PDF active-content
 * rejection + page-only rewrite, raster re-encode, decompression-bomb caps.
 *
 * Not a virus scanner — Vercel has no ClamAV. These controls close XSS in the
 * inline viewer, stored executable/polyglot payloads, and JS-laden PDFs sent
 * to OCR/LLM APIs.
 */

import "server-only";

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  type AllowedDocumentMimeType,
} from "@/lib/documents/constants";

const PDF_ACTIVE_NAMES = new Set([
  "JavaScript",
  "JS",
  "OpenAction",
  "Launch",
  "EmbeddedFile",
  "RichMedia",
  "RichMediaInstance",
  "XFA",
  "SubmitForm",
  "ImportData",
  "GoToE",
  "Movie",
  "Sound",
  "FileAttachment",
  "Encrypt",
]);

/** Additional-actions dicts are the usual host for page-level JS. */
const PDF_ACTION_NAMES = new Set(["AA"]);

const MAX_RASTER_PIXELS = 40_000_000;
const MAX_RASTER_EDGE = 12_000;
const MAX_PDF_PAGES = 80;

const HTML_POLY_RE =
  /<(?:html|head|body|script|iframe|svg|math|embed|object|link)\b/i;

export type HardenSuccess = {
  ok: true;
  bytes: Uint8Array;
  mime: AllowedDocumentMimeType;
};

export type HardenFailure = {
  ok: false;
  error: string;
};

export type HardenUploadOptions = {
  /**
   * Re-encode JPEG/PNG/WebP (and HEIC→JPEG) through the canvas pipeline.
   * Default true. Tests set false to stay pure and skip native canvas.
   */
  reencodeImages?: boolean;
};

function isPdfWs(byte: number): boolean {
  return (
    byte === 0x00 ||
    byte === 0x09 ||
    byte === 0x0a ||
    byte === 0x0c ||
    byte === 0x0d ||
    byte === 0x20
  );
}

function isPdfNameDelim(byte: number): boolean {
  return (
    isPdfWs(byte) ||
    byte === 0x28 || // (
    byte === 0x29 || // )
    byte === 0x3c || // <
    byte === 0x3e || // >
    byte === 0x5b || // [
    byte === 0x5d || // ]
    byte === 0x7b || // {
    byte === 0x7d || // }
    byte === 0x2f || // /
    byte === 0x25 // %
  );
}

function asciiAt(bytes: Uint8Array, offset: number, token: string): boolean {
  if (offset < 0 || offset + token.length > bytes.length) return false;
  for (let i = 0; i < token.length; i += 1) {
    if (bytes[offset + i] !== token.charCodeAt(i)) return false;
  }
  return true;
}

function latin1Slice(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  const last = Math.min(end, bytes.length);
  for (let i = Math.max(0, start); i < last; i += 1) {
    out += String.fromCharCode(bytes[i] ?? 0);
  }
  return out;
}

/**
 * PDF header must lead the file (optional UTF-8 BOM). HTML/PDF polyglots
 * put markup first and fail this check.
 */
export function pdfHeaderOffset(bytes: Uint8Array): number {
  let offset = 0;
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    offset = 3;
  }
  if (
    bytes.length >= offset + 5 &&
    bytes[offset] === 0x25 &&
    bytes[offset + 1] === 0x50 &&
    bytes[offset + 2] === 0x44 &&
    bytes[offset + 3] === 0x46 &&
    bytes[offset + 4] === 0x2d
  ) {
    return offset;
  }
  return -1;
}

export function lastPdfEofIndex(bytes: Uint8Array): number {
  const needle = [0x25, 0x25, 0x45, 0x4f, 0x46]; // %%EOF
  for (let i = bytes.length - needle.length; i >= 0; i -= 1) {
    let match = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (bytes[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

function skipPdfString(bytes: Uint8Array, start: number): number {
  // start points at '('
  let depth = 1;
  let i = start + 1;
  while (i < bytes.length && depth > 0) {
    const b = bytes[i] ?? 0;
    if (b === 0x5c) {
      i += 2;
      continue;
    }
    if (b === 0x28) depth += 1;
    else if (b === 0x29) depth -= 1;
    i += 1;
  }
  return i;
}

function skipPdfHexString(bytes: Uint8Array, start: number): number {
  // start at '<' of a hex string, not '<<'
  let i = start + 1;
  while (i < bytes.length && bytes[i] !== 0x3e) i += 1;
  return Math.min(i + 1, bytes.length);
}

function parseStreamLengthBefore(bytes: Uint8Array, streamKeywordIndex: number): number | null {
  const lookback = Math.max(0, streamKeywordIndex - 768);
  const header = latin1Slice(bytes, lookback, streamKeywordIndex);
  const matches = [...header.matchAll(/\/Length\s+(\d{1,10})\b/g)];
  if (matches.length === 0) return null;
  const raw = matches[matches.length - 1]?.[1];
  if (!raw) return null;
  const length = Number.parseInt(raw, 10);
  if (!Number.isFinite(length) || length < 0) return null;
  return length;
}

function skipPdfStream(bytes: Uint8Array, streamKeywordIndex: number): number {
  let dataStart = streamKeywordIndex + "stream".length;
  while (dataStart < bytes.length && isPdfWs(bytes[dataStart] ?? 0)) {
    dataStart += 1;
  }
  if (bytes[dataStart] === 0x0d) dataStart += 1;
  if (bytes[dataStart] === 0x0a) dataStart += 1;

  const declaredLength = parseStreamLengthBefore(bytes, streamKeywordIndex);
  if (declaredLength !== null) {
    const afterData = dataStart + declaredLength;
    let cursor = afterData;
    while (cursor < bytes.length && isPdfWs(bytes[cursor] ?? 0)) {
      cursor += 1;
    }
    if (isKeywordAt(bytes, cursor, "endstream")) {
      return cursor + "endstream".length;
    }
  }

  const end = indexOfPdfKeyword(bytes, streamKeywordIndex + 6, "endstream");
  if (end < 0) return bytes.length;
  return end + "endstream".length;
}

function indexOfPdfKeyword(
  bytes: Uint8Array,
  from: number,
  keyword: string,
): number {
  for (let i = from; i <= bytes.length - keyword.length; i += 1) {
    if (isKeywordAt(bytes, i, keyword)) return i;
  }
  return -1;
}

function parsePdfName(bytes: Uint8Array, start: number): {
  name: string;
  next: number;
} | null {
  if (bytes[start] !== 0x2f) return null;
  let i = start + 1;
  let name = "";
  while (i < bytes.length && !isPdfNameDelim(bytes[i] ?? 0)) {
    const b = bytes[i] ?? 0;
    if (b === 0x23 && i + 2 < bytes.length) {
      const hex = latin1Slice(bytes, i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) return null;
      name += String.fromCharCode(Number.parseInt(hex, 16));
      i += 3;
      continue;
    }
    name += String.fromCharCode(b);
    i += 1;
    if (name.length > 127) return null;
  }
  return { name, next: i };
}

function isKeywordAt(
  bytes: Uint8Array,
  offset: number,
  keyword: string,
): boolean {
  if (!asciiAt(bytes, offset, keyword)) return false;
  const before = offset === 0 ? 0x20 : (bytes[offset - 1] ?? 0x20);
  const after = bytes[offset + keyword.length] ?? 0x20;
  return isPdfNameDelim(before) && isPdfNameDelim(after);
}

/**
 * Walk PDF syntax (skipping streams/strings) and collect name tokens.
 * Compressed object streams can still hide JS — callers rewrite when possible.
 */
export function findPdfActiveContent(bytes: Uint8Array): string | null {
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i] ?? 0;

    if (b === 0x25) {
      while (i < bytes.length && bytes[i] !== 0x0a && bytes[i] !== 0x0d) {
        i += 1;
      }
      continue;
    }

    if (isKeywordAt(bytes, i, "stream")) {
      i = skipPdfStream(bytes, i);
      continue;
    }

    if (b === 0x28) {
      i = skipPdfString(bytes, i);
      continue;
    }

    if (b === 0x3c) {
      if (bytes[i + 1] === 0x3c) {
        i += 2;
        continue;
      }
      i = skipPdfHexString(bytes, i);
      continue;
    }

    if (b === 0x3e && bytes[i + 1] === 0x3e) {
      i += 2;
      continue;
    }

    if (b === 0x2f) {
      const parsed = parsePdfName(bytes, i);
      if (!parsed) {
        i += 1;
        continue;
      }
      if (PDF_ACTIVE_NAMES.has(parsed.name) || PDF_ACTION_NAMES.has(parsed.name)) {
        return parsed.name;
      }
      i = parsed.next;
      continue;
    }

    i += 1;
  }
  return null;
}

export function declaredPdfPageCount(bytes: Uint8Array): number | null {
  const text = latin1Slice(bytes, 0, Math.min(bytes.length, 2_000_000));
  const matches = [...text.matchAll(/\/Count\s+(\d{1,8})\b/g)];
  if (matches.length === 0) return null;
  let max = 0;
  for (const match of matches) {
    const value = Number.parseInt(match[1] ?? "0", 10);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max || null;
}

export function looksLikeHtmlOrSvgPolyglot(bytes: Uint8Array): boolean {
  const head = latin1Slice(bytes, 0, Math.min(bytes.length, 1024));
  if (HTML_POLY_RE.test(head)) return true;
  if (/^\s*<\?xml/i.test(head) && /<svg\b/i.test(head)) return true;
  return false;
}

export function stripJpegTrailer(bytes: Uint8Array): Uint8Array {
  let eoi = -1;
  for (let i = bytes.length - 2; i >= 2; i -= 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
      eoi = i + 2;
      break;
    }
  }
  if (eoi < 0) return bytes;
  return bytes.subarray(0, eoi);
}

export function stripPngTrailer(bytes: Uint8Array): Uint8Array {
  // IEND chunk: length=0, type IEND, crc
  const iend = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44];
  for (let i = 8; i <= bytes.length - 12; i += 1) {
    let match = true;
    for (let j = 0; j < iend.length; j += 1) {
      if (bytes[i + j] !== iend[j]) {
        match = false;
        break;
      }
    }
    if (match) return bytes.subarray(0, i + 12);
  }
  return bytes;
}

export function stripWebpToRiff(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 12) return bytes;
  const size =
    (bytes[4] ?? 0) +
    ((bytes[5] ?? 0) << 8) +
    ((bytes[6] ?? 0) << 16) +
    ((bytes[7] ?? 0) << 24);
  const total = 8 + size;
  if (total < 12 || total > bytes.length) return bytes;
  return bytes.subarray(0, total);
}

export function pngPixelCount(bytes: Uint8Array): number | null {
  if (bytes.length < 24) return null;
  const width =
    ((bytes[16] ?? 0) << 24) |
    ((bytes[17] ?? 0) << 16) |
    ((bytes[18] ?? 0) << 8) |
    (bytes[19] ?? 0);
  const height =
    ((bytes[20] ?? 0) << 24) |
    ((bytes[21] ?? 0) << 16) |
    ((bytes[22] ?? 0) << 8) |
    (bytes[23] ?? 0);
  if (width < 1 || height < 1) return null;
  return width * height;
}

export function jpegPixelCount(bytes: Uint8Array): number | null {
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
    if (length < 2) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && i + 8 < bytes.length) {
      const height = ((bytes[i + 5] ?? 0) << 8) | (bytes[i + 6] ?? 0);
      const width = ((bytes[i + 7] ?? 0) << 8) | (bytes[i + 8] ?? 0);
      if (width < 1 || height < 1) return null;
      return width * height;
    }
    i += 2 + length;
  }
  return null;
}

function pixelBombError(pixels: number | null, widthHint?: number): string | null {
  if (pixels === null) return null;
  if (pixels > MAX_RASTER_PIXELS) {
    return "Bildauflösung ist zu hoch (mögliche Dekompressionsbombe).";
  }
  if (widthHint && widthHint > MAX_RASTER_EDGE) {
    return "Bildkante ist zu groß.";
  }
  return null;
}

export function rasterPixelBombError(
  bytes: Uint8Array,
  mime: AllowedDocumentMimeType,
): string | null {
  if (mime === "image/png") {
    return pixelBombError(pngPixelCount(bytes));
  }
  if (mime === "image/jpeg") {
    return pixelBombError(jpegPixelCount(bytes));
  }
  return null;
}

function stripPdfTrailer(bytes: Uint8Array): Uint8Array {
  const eof = lastPdfEofIndex(bytes);
  if (eof < 0) return bytes;
  let end = eof + 5;
  while (end < bytes.length && isPdfWs(bytes[end] ?? 1)) end += 1;
  return bytes.subarray(0, end);
}

function pdfBasicStructureError(bytes: Uint8Array): string | null {
  if (pdfHeaderOffset(bytes) < 0) {
    return "PDF-Kopf fehlt oder Datei ist ein Polyglot.";
  }
  if (lastPdfEofIndex(bytes) < 0) {
    return "PDF ist unvollständig (EOF fehlt).";
  }
  const pages = declaredPdfPageCount(bytes);
  if (pages !== null && pages > MAX_PDF_PAGES) {
    return `PDF hat zu viele Seiten (max. ${MAX_PDF_PAGES}).`;
  }
  const head = latin1Slice(bytes, 0, Math.min(bytes.length, 256));
  if (HTML_POLY_RE.test(head)) {
    return "PDF/HTML-Polyglot erkannt.";
  }
  return null;
}

function pdfActiveContentError(bytes: Uint8Array): string | null {
  const active = findPdfActiveContent(bytes);
  if (active) {
    return "PDF enthält aktive Inhalte (Skript, Anhang oder Auto-Aktion) und wurde abgelehnt.";
  }
  return null;
}

function pdfStructureError(bytes: Uint8Array): string | null {
  return pdfBasicStructureError(bytes) ?? pdfActiveContentError(bytes);
}

async function rewritePdfPagesOnly(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    // Best-effort page-only rewrite. Types resolve after `npm install`.
    // @ts-ignore
    const { PDFDocument, PDFName } = await import("pdf-lib");
    const source = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
    });
    if (source.isEncrypted) {
      throw new Error("encrypted");
    }
    const output = await PDFDocument.create();
    const indices = source.getPageIndices();
    if (indices.length > MAX_PDF_PAGES) {
      throw new Error("too many pages");
    }
    const copied = await output.copyPages(source, indices);
    for (const page of copied) {
      page.node.delete(PDFName.of("Annots"));
      page.node.delete(PDFName.of("AA"));
      output.addPage(page);
    }
    output.setTitle("");
    output.setAuthor("");
    output.setSubject("");
    output.setKeywords([]);
    output.setProducer("ZeloxTag");
    output.setCreator("ZeloxTag");
    const saved = await output.save({ useObjectStreams: false });
    return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "encrypted" || /encrypt/i.test(message)) {
      throw new Error("encrypted");
    }
    if (message === "too many pages") {
      throw new Error("too many pages");
    }
    const isMissingModule =
      /cannot find module|failed to resolve|cannot find package/i.test(
        `${message} ${String(error)}`,
      );
    if (!isMissingModule) {
      console.error("[upload-hardening] pdf rewrite failed", error);
    }
    return bytes;
  }
}

async function reencodeRaster(
  bytes: Uint8Array,
  mime: AllowedDocumentMimeType,
): Promise<{ bytes: Uint8Array; mime: AllowedDocumentMimeType }> {
  const { resizeImageToMaxEdge } = await import("@/lib/image/server-canvas");
  const { isHeicMime, convertHeicToJpeg } = await import(
    "@/lib/image/convert-heic-to-jpeg"
  );

  if (isHeicMime(mime)) {
    const jpeg = await convertHeicToJpeg(Buffer.from(bytes), 0.88);
    return { bytes: new Uint8Array(jpeg), mime: "image/jpeg" };
  }

  const format = mime === "image/png" ? "png" : "jpeg";
  const encoded = await resizeImageToMaxEdge(
    Buffer.from(bytes),
    MAX_RASTER_EDGE,
    format,
    88,
    mime,
  );
  return {
    bytes: new Uint8Array(encoded),
    mime: format === "png" ? "image/png" : "image/jpeg",
  };
}

function isAllowedMime(value: string): value is AllowedDocumentMimeType {
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Second-stage harden: full-file polyglot cut, PDF active-content gate,
 * optional raster re-encode. Input must already have a sniffed MIME.
 */
export async function hardenUploadBytes(
  input: Uint8Array,
  mime: AllowedDocumentMimeType,
  options?: HardenUploadOptions,
): Promise<HardenSuccess | HardenFailure> {
  if (!isAllowedMime(mime)) {
    return { ok: false, error: "Dateityp ist nicht erlaubt." };
  }

  if (looksLikeHtmlOrSvgPolyglot(input) && mime !== "application/pdf") {
    return { ok: false, error: "Datei enthält eingebettetes HTML/SVG und wurde abgelehnt." };
  }

  let bytes = input;
  let resolved: AllowedDocumentMimeType = mime;

  if (mime === "application/pdf") {
    const basic = pdfBasicStructureError(bytes);
    if (basic) return { ok: false, error: basic };
    bytes = stripPdfTrailer(bytes);
    try {
      bytes = await rewritePdfPagesOnly(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "encrypted") {
        return { ok: false, error: "Verschlüsselte PDFs werden nicht akzeptiert." };
      }
      if (message === "too many pages") {
        return {
          ok: false,
          error: `PDF hat zu viele Seiten (max. ${MAX_PDF_PAGES}).`,
        };
      }
      throw error;
    }
    const after = pdfActiveContentError(bytes);
    if (after) return { ok: false, error: after };
    return { ok: true, bytes, mime: "application/pdf" };
  }

  if (mime === "image/jpeg") {
    bytes = stripJpegTrailer(bytes);
  } else if (mime === "image/png") {
    bytes = stripPngTrailer(bytes);
  } else if (mime === "image/webp") {
    bytes = stripWebpToRiff(bytes);
  }

  const bomb = rasterPixelBombError(bytes, mime);
  if (bomb) return { ok: false, error: bomb };

  const reencode = options?.reencodeImages !== false;
  if (
    reencode &&
    (mime === "image/jpeg" ||
      mime === "image/png" ||
      mime === "image/webp" ||
      mime === "image/heic" ||
      mime === "image/heif")
  ) {
    try {
      const encoded = await reencodeRaster(bytes, mime);
      bytes = encoded.bytes;
      resolved = encoded.mime;
    } catch {
      return {
        ok: false,
        error: "Bild konnte nicht geprüft werden. Bitte als JPEG oder PNG speichern.",
      };
    }
  }

  return { ok: true, bytes, mime: resolved };
}
