import { DOCUMENT_BUCKET } from "./constants";

export type DocumentMediaKind = "pdf" | "image" | "unknown";

/**
 * Classify a document URL by path / extension for the in-app viewer.
 */
export function documentMediaKind(fileUrl: string): DocumentMediaKind {
  const lower = fileUrl.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".pdf") || lower.includes("application/pdf")) {
    return "pdf";
  }
  if (/\.(jpe?g|png|webp|gif|heic|heif|svg)$/.test(lower)) {
    return "image";
  }
  return "unknown";
}

function isSupabaseDocumentObjectPath(pathname: string): boolean {
  return (
    pathname.includes(`/object/public/${DOCUMENT_BUCKET}/`) ||
    pathname.includes(`/object/authenticated/${DOCUMENT_BUCKET}/`) ||
    pathname.includes(`/object/sign/${DOCUMENT_BUCKET}/`)
  );
}

/** `{vehicleId}/{documentId}-filename.pdf` stored without host prefix. */
const STORAGE_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i;

export function isDocumentStoragePath(fileUrl: string): boolean {
  return STORAGE_PATH_RE.test(fileUrl.trim());
}

/**
 * Whether this URL can be opened in the in-app viewer (has real bytes).
 * Private-bucket objects are still viewable via `/api/documents/file` proxy.
 */
export function isViewableDocumentUrl(fileUrl: string): boolean {
  if (!fileUrl || fileUrl.startsWith("mock://")) return false;
  if (fileUrl.startsWith("manual://")) return false;
  if (fileUrl.startsWith("/demo/")) return true;
  if (isDocumentStoragePath(fileUrl)) return true;
  try {
    const url = new URL(fileUrl);
    return isSupabaseDocumentObjectPath(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Resolve a view URL — demo/static assets skip the auth-gated proxy.
 */
export function resolveDocumentViewUrl(fileUrl: string): string {
  if (fileUrl.startsWith("/demo/")) return fileUrl;
  if (isDocumentStoragePath(fileUrl)) {
    const params = new URLSearchParams({ path: fileUrl.trim() });
    return `/api/documents/file?${params.toString()}`;
  }
  return inlineDocumentProxyUrl(fileUrl);
}

/**
 * Same-origin proxy URL that forces `Content-Disposition: inline`.
 */
export function inlineDocumentProxyUrl(fileUrl: string): string {
  const params = new URLSearchParams({ src: fileUrl });
  return `/api/documents/file?${params.toString()}`;
}

/** Open the document inline — same-tab navigation avoids mobile popup blockers. */
export function openDocumentOriginal(fileUrl: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(resolveDocumentViewUrl(fileUrl));
}

export function parseContentDispositionFilename(
  header: string | null | undefined,
): string | null {
  if (!header) return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const plain = header.match(/filename="([^"]+)"/i);
  return plain?.[1]?.trim() ?? null;
}

/** Trigger a file download without `window.open` (popup-safe on mobile). */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }
}
