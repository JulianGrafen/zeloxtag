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

/**
 * Whether this URL can be opened in the in-app viewer (has real bytes).
 * Private-bucket objects are still viewable via `/api/documents/file` proxy.
 */
export function isViewableDocumentUrl(fileUrl: string): boolean {
  if (!fileUrl || fileUrl.startsWith("mock://")) return false;
  if (fileUrl.startsWith("manual://")) return false;
  if (fileUrl.startsWith("/demo/")) return true;
  try {
    const url = new URL(fileUrl);
    return isSupabaseDocumentObjectPath(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Same-origin proxy URL that forces `Content-Disposition: inline`.
 */
export function inlineDocumentProxyUrl(fileUrl: string): string {
  const params = new URLSearchParams({ src: fileUrl });
  return `/api/documents/file?${params.toString()}`;
}

/** Open the document inline in the system browser / PDF viewer. */
export function openDocumentOriginal(fileUrl: string): void {
  if (typeof window === "undefined") return;
  const url = inlineDocumentProxyUrl(fileUrl);
  window.open(url, "_blank", "noopener,noreferrer");
}
