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
  LLM_IMAGE_MAX_EDGE_PX,
  type DocumentBytesInput,
} from "./prepare-document-for-llm";
import type { OcrJsonPayload } from "./ocr-types";
import type { InvoiceTextParseResult } from "./text-parse-schema";
import { isPlausibleVendorLine, resolveVendorName } from "./vendor-from-text";

const HEADER_BAND_FRACTIONS = [0.24, 0.32] as const;
const MIN_HEADER_HEIGHT_PX = 100;
const MAX_HEADER_HEIGHT_PX = 720;

async function decodeImageBytes(bytes: Buffer, mime?: string): Promise<Buffer> {
  const heicMime = resolveHeicMime(bytes, mime);
  if (heicMime) {
    return (await normalizeHeicUploadBytes(bytes, heicMime)).bytes;
  }
  return bytes;
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
 * Crop the invoice letterhead band (logo + Werkstattname) for focused vision OCR.
 */
export async function cropInvoiceHeaderBand(
  bytes: Buffer,
  mime?: string,
  headerBandFraction: number = HEADER_BAND_FRACTIONS[0],
): Promise<{ bytes: Buffer; contentType: "image/jpeg" } | null> {
  try {
    const decoded = await decodeImageBytes(bytes, mime);
    const image = await loadImage(decoded);
    const headerHeight = Math.min(
      MAX_HEADER_HEIGHT_PX,
      Math.max(
        MIN_HEADER_HEIGHT_PX,
        Math.round(image.height * headerBandFraction),
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

/** Downscale full page for logo vision when header crops miss edge logos. */
async function prepareFullPageForLogoVision(
  bytes: Buffer,
  mime?: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const decoded = await decodeImageBytes(bytes, mime);
    const image = await loadImage(decoded);
    const maxEdge = Math.max(image.width, image.height);
    if (maxEdge <= LLM_IMAGE_MAX_EDGE_PX) {
      return {
        bytes: decoded,
        contentType: normalizeLogoContentType(mime ?? "image/jpeg"),
      };
    }

    const scale = LLM_IMAGE_MAX_EDGE_PX / maxEdge;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return { bytes: canvas.toBuffer("image/jpeg"), contentType: "image/jpeg" };
  } catch (error) {
    console.warn("[invoice-vendor-from-logo] full-page resize failed", error);
    return null;
  }
}

async function tryExtractVendorFromImage(
  bytes: Buffer,
  contentType: string,
): Promise<string | null> {
  const vendor = await extractVendorFromLogoImage({ bytes, contentType });
  if (vendor && isPlausibleVendorLine(vendor)) {
    return vendor.trim().slice(0, 160);
  }
  return null;
}

/**
 * Read workshop name from the logo / letterhead via multimodal LLM.
 * PDFs are rasterized to page 1 first; tries header bands then full page.
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

    for (const fraction of HEADER_BAND_FRACTIONS) {
      const cropped = await cropInvoiceHeaderBand(bytes, mime, fraction);
      if (!cropped) continue;

      const vendor = await tryExtractVendorFromImage(
        cropped.bytes,
        normalizeLogoContentType(cropped.contentType),
      );
      if (vendor) return vendor;
    }

    const fullPage = await prepareFullPageForLogoVision(bytes, mime);
    if (fullPage) {
      const vendor = await tryExtractVendorFromImage(
        fullPage.bytes,
        normalizeLogoContentType(fullPage.contentType),
      );
      if (vendor) return vendor;
    }

    return null;
  } catch (error) {
    console.warn("[invoice-vendor-from-logo] logo extract failed", error);
    return null;
  }
}

/** Merge logo vision vendor into parsed invoice fields (vision path). */
export function mergeVisionVendorIntoInvoiceFields(
  fields: InvoiceTextParseResult,
  ocrJson: OcrJsonPayload,
  visionVendor: string | null,
): InvoiceTextParseResult {
  const headerBlob = ocrJson.headerLines.join("\n");
  const fullText = `${headerBlob}\n${ocrJson.text}`.trim();
  const vendor = resolveVendorName({
    structuredVendor: fields.vendor,
    logoCandidates: ocrJson.headerLines.slice(0, 4),
    visionVendor,
    rawText: fullText,
  });
  return { ...fields, vendor };
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
