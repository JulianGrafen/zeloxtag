/** PNG magic header — validates bytes regardless of Content-Type. */
export function isPngBytes(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength > 32 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

export function isJpegBytes(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength > 32 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

export function isLikelyImageBytes(bytes: Uint8Array): boolean {
  return isPngBytes(bytes) || isJpegBytes(bytes);
}

export function imageContentTypeFromBytes(bytes: Uint8Array): string {
  if (isPngBytes(bytes)) return "image/png";
  if (isJpegBytes(bytes)) return "image/jpeg";
  return "application/octet-stream";
}

export function isLikelyImageResponse(
  contentType: string,
  bytes: Uint8Array,
): boolean {
  if (!isLikelyImageBytes(bytes)) return false;
  const type = contentType.toLowerCase();
  if (type.includes("image")) return true;
  if (type.includes("octet-stream") || type === "") return true;
  return false;
}
