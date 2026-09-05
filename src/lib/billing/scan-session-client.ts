/** Client helpers for complimentary OCR scan session threading. */

export function appendScanSessionId(
  body: FormData,
  scanSessionId?: string | null,
): void {
  if (scanSessionId) {
    body.set("scanSessionId", scanSessionId);
  }
}

export function readScanSessionId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const id = (payload as { scanSessionId?: unknown }).scanSessionId;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : undefined;
}

export function mergeScanSessionId(
  current: string | null | undefined,
  payload: unknown,
): string | null {
  return readScanSessionId(payload) ?? current ?? null;
}
