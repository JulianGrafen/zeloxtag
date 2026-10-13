"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

type ScanDocumentPreviewProps = {
  url: string;
  kind: "pdf" | "image";
  pageCount?: number;
  alt?: string;
  className?: string;
};

/**
 * Mobile-safe scan preview — avoids WKWebView iframe "Load Failed" on blob: PDFs.
 */
export function ScanDocumentPreview({
  url,
  kind,
  pageCount = 1,
  alt = "Dokumentvorschau",
  className = "max-h-[32vh] w-full",
}: ScanDocumentPreviewProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [url, kind]);

  if (kind === "pdf") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-neutral-100 px-4 py-8 text-center ${className}`}
      >
        <FileText className="h-8 w-8 text-neutral-500" aria-hidden />
        <p className="text-[0.82rem] font-medium text-neutral-700">
          PDF · {pageCount} {pageCount === 1 ? "Seite" : "Seiten"}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.78rem] font-medium text-[color:var(--vd-accent)] underline-offset-2 hover:underline"
        >
          Vorschau öffnen
        </a>
      </div>
    );
  }

  if (imageError) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-neutral-100 px-4 py-8 text-center ${className}`}
      >
        <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
          Vorschau konnte nicht geladen werden.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.78rem] font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
        >
          Bild öffnen
        </a>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={`bg-neutral-100 object-contain ${className}`}
      onError={() => setImageError(true)}
    />
  );
}
