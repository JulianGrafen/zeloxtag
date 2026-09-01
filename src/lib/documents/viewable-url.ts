import { DOCUMENT_BUCKET } from "./constants";
import { resolveStoragePath } from "./storage-path";

export { isDocumentStoragePath } from "./storage-path";

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

/**
 * Whether this URL can be opened in the in-app viewer (has real bytes).
 * Private-bucket objects are still viewable via `/api/documents/file` proxy.
 */
export function isViewableDocumentUrl(fileUrl: string): boolean {
  if (!fileUrl || fileUrl.startsWith("mock://")) return false;
  if (fileUrl.startsWith("manual://")) return false;
  if (fileUrl.startsWith("/demo/")) return true;
  if (resolveStoragePath(fileUrl)) return true;
  try {
    const url = new URL(fileUrl);
    return isSupabaseDocumentObjectPath(url.pathname);
  } catch {
    return false;
  }
}

function documentFileProxyUrl(fileUrl: string): string {
  const storagePath = resolveStoragePath(fileUrl);
  if (storagePath) {
    const params = new URLSearchParams({ path: storagePath });
    return `/api/documents/file?${params.toString()}`;
  }
  const params = new URLSearchParams({ src: fileUrl });
  return `/api/documents/file?${params.toString()}`;
}

/**
 * Resolve a view URL — demo/static assets skip the auth-gated proxy.
 * Storage objects always go through same-origin `path=` (never a signed URL).
 */
export function resolveDocumentViewUrl(fileUrl: string): string {
  if (fileUrl.startsWith("/demo/")) return fileUrl;
  return documentFileProxyUrl(fileUrl);
}

/**
 * Same-origin proxy URL that forces `Content-Disposition: inline`.
 */
export function inlineDocumentProxyUrl(fileUrl: string): string {
  return documentFileProxyUrl(fileUrl);
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
