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

export function isLikelyImageResponse(
  contentType: string,
  bytes: Uint8Array,
): boolean {
  const type = contentType.toLowerCase();
  if (type.includes("image")) return isPngBytes(bytes);
  if (type.includes("octet-stream") || type === "") return isPngBytes(bytes);
  return false;
}
