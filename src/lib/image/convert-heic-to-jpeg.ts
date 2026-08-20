import "server-only";

export class HeicConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HeicConversionError";
  }
}

export function isHeicMime(mime: string): boolean {
  const normalized = mime.trim().toLowerCase();
  return normalized === "image/heic" || normalized === "image/heif";
}

/** ISO BMFF ftyp brand sniff — matches server upload validation. */
export function sniffHeicMimeFromBytes(
  bytes: Buffer | Uint8Array,
): "image/heic" | "image/heif" | null {
  if (bytes.byteLength < 12) return null;
  if (
    bytes[4] !== 0x66 ||
    bytes[5] !== 0x74 ||
    bytes[6] !== 0x79 ||
    bytes[7] !== 0x70
  ) {
    return null;
  }
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
  return null;
}

export function resolveHeicMime(
  bytes: Buffer | Uint8Array,
  declaredMime?: string,
): "image/heic" | "image/heif" | null {
  if (declaredMime && isHeicMime(declaredMime)) {
    return declaredMime.trim().toLowerCase() as "image/heic" | "image/heif";
  }
  return sniffHeicMimeFromBytes(bytes);
}

type HeicConvertFn = (options: {
  buffer: Buffer;
  format: "JPEG" | "PNG";
  quality?: number;
}) => Promise<ArrayBuffer | Uint8Array>;

let heicConvertPromise: Promise<HeicConvertFn> | null = null;

async function loadHeicConvert(): Promise<HeicConvertFn> {
  if (!heicConvertPromise) {
    heicConvertPromise = import("heic-convert").then((mod) => {
      const candidate = mod.default ?? mod;
      if (typeof candidate !== "function") {
        throw new HeicConversionError("HEIC-Konverter ist nicht verfügbar.");
      }
      return candidate as HeicConvertFn;
    });
  }
  return heicConvertPromise;
}

/**
 * Decode HEIC/HEIF to JPEG for canvas, OCR, and storage pipelines.
 */
export async function convertHeicToJpeg(
  bytes: Buffer,
  quality = 0.85,
): Promise<Buffer> {
  try {
    const convert = await loadHeicConvert();
    const output = await convert({
      buffer: bytes,
      format: "JPEG",
      quality,
    });
    return Buffer.from(
      output instanceof ArrayBuffer ? new Uint8Array(output) : output,
    );
  } catch (error) {
    if (error instanceof HeicConversionError) throw error;
    console.error("[convert-heic-to-jpeg] conversion failed", error);
    throw new HeicConversionError(
      "HEIC konnte nicht gelesen werden. Bitte JPEG, PNG oder PDF wählen.",
    );
  }
}

/**
 * Returns JPEG bytes when input is HEIC/HEIF; otherwise passes through unchanged.
 */
export async function normalizeHeicUploadBytes(
  bytes: Buffer,
  mime: string,
): Promise<{ bytes: Buffer; mime: string }> {
  if (!isHeicMime(mime)) {
    return { bytes, mime };
  }
  const jpeg = await convertHeicToJpeg(bytes);
  return { bytes: jpeg, mime: "image/jpeg" };
}
