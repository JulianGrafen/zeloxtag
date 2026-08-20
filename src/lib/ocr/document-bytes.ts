/** Magic-byte helpers for server-side document prep. */

import { sniffHeicMimeFromBytes } from "@/lib/image/convert-heic-to-jpeg";

export function isPdfBuffer(bytes: Buffer): boolean {
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export function isPngBuffer(bytes: Buffer): boolean {
  return (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

export function isJpegBuffer(bytes: Buffer): boolean {
  return (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

export function isWebpBuffer(bytes: Buffer): boolean {
  return (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export function isProbablyRasterImage(bytes: Buffer): boolean {
  if (isPngBuffer(bytes) || isJpegBuffer(bytes) || isWebpBuffer(bytes)) {
    return true;
  }

  if (bytes.byteLength >= 12) {

    // HEIC/HEIF (....ftyp)
    if (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      return true;
    }
  }

  return false;
}

export function resolveDocumentContentType(
  bytes: Buffer,
  declaredContentType: string,
): string {
  if (declaredContentType === "application/pdf" || isPdfBuffer(bytes)) {
    return "application/pdf";
  }
  if (isPngBuffer(bytes)) return "image/png";
  if (isJpegBuffer(bytes)) return "image/jpeg";
  if (isWebpBuffer(bytes)) return "image/webp";
  const heic = sniffHeicMimeFromBytes(bytes);
  if (heic) return heic;
  return declaredContentType;
}
