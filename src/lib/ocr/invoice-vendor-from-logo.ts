import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import {
  isHeicMime,
  normalizeHeicUploadBytes,
  resolveHeicMime,
} from "@/lib/image/convert-heic-to-jpeg";

import { isPdfBuffer } from "./document-bytes";
import { extractVendorFromLogoImage } from "./extract-vendor-from-logo";
import { rasterizePdfPagesWithPdfJs } from "./pdf-rasterize-server";
import {
  LLM_DOCUMENT_RASTER_DPI,
  type DocumentBytesInput,
} from "./prepare-document-for-llm";
import { resolveVendorName } from "./vendor-from-text";

/** Top band of page 1 — letterhead / logo region on German workshop invoices. */
const HEADER_BAND_FRACTION = 0.24;
const MIN_HEADER_HEIGHT_PX = 100;
const MAX_HEADER_HEIGHT_PX = 720;

async function decodeImageBytes(bytes: Buffer, mime?: string): Promise<Buffer> {
  const heicMime = resolveHeicMime(bytes, mime);
  if (heicMime) {
    return (await normalizeHeicUploadBytes(bytes, heicMime)).bytes;
  }
  return bytes;
}

/**
 * Crop the invoice letterhead band (logo + Werkstattname) for focused vision OCR.
 */
export async function cropInvoiceHeaderBand(
  bytes: Buffer,
  mime?: string,
): Promise<{ bytes: Buffer; contentType: "image/jpeg" } | null> {
  try {
    const decoded = await decodeImageBytes(bytes, mime);
    const image = await loadImage(decoded);
    const headerHeight = Math.min(
      MAX_HEADER_HEIGHT_PX,
      Math.max(
        MIN_HEADER_HEIGHT_PX,
        Math.round(image.height * HEADER_BAND_FRACTION),
      ),
    );

    const canvas = createCanvas(image.width, headerHeight);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, image.width, headerHeight);
    ctx.drawImage(
      image,
      0,
      0,
      image.width,
      headerHeight,
      0,
      0,
      image.width,
      headerHeight,
    );

    return { bytes: canvas.toBuffer("image/jpeg"), contentType: "image/jpeg" };
  } catch (error) {
    console.warn("[invoice-vendor-from-logo] header crop failed", error);
    return null;
  }
}

function normalizeLogoContentType(contentType: string): string {
  const lower = contentType.toLowerCase();
  if (lower === "image/jpg") return "image/jpeg";
  if (
    lower === "image/jpeg" ||
    lower === "image/png" ||
    lower === "image/webp" ||
    lower === "image/gif"
  ) {
    return lower;
  }
  return "image/jpeg";
}

/**
 * Read workshop name from the logo / letterhead via multimodal LLM.
 * PDFs are rasterized to page 1 first; images are header-cropped.
 */
export async function extractVendorFromLogoHeader(
  input: DocumentBytesInput,
): Promise<string | null> {
  try {
    let bytes = input.bytes;
    let mime = input.contentType;

    if (isPdfBuffer(bytes) || mime === "application/pdf") {
      const pages = await rasterizePdfPagesWithPdfJs(
        bytes,
        1,
        LLM_DOCUMENT_RASTER_DPI,
      );
      if (!pages[0]) return null;
      bytes = pages[0];
      mime = "image/png";
    }

    const cropped = await cropInvoiceHeaderBand(bytes, mime);
    const targetBytes = cropped?.bytes ?? bytes;
    const contentType = normalizeLogoContentType(
      cropped?.contentType ?? mime,
    );

    return await extractVendorFromLogoImage({
      bytes: targetBytes,
      contentType,
    });
  } catch (error) {
    console.warn("[invoice-vendor-from-logo] logo extract failed", error);
    return null;
  }
}

/**
 * Merge structured LLM / OCR vendor fields with dedicated logo vision.
 */
export async function resolveInvoiceVendor(input: {
  documentInput?: DocumentBytesInput | null;
  structuredVendor: string | null;
  logoCandidates?: Array<string | null | undefined>;
  rawText: string;
}): Promise<string | null> {
  const visionVendor = input.documentInput
    ? await extractVendorFromLogoHeader(input.documentInput)
    : null;

  return resolveVendorName({
    structuredVendor: input.structuredVendor,
    logoCandidates: input.logoCandidates ?? [],
    visionVendor,
    rawText: input.rawText,
  });
}
