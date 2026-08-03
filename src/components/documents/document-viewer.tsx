"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import {
  documentMediaKind,
  inlineDocumentProxyUrl,
} from "@/lib/documents/viewable-url";

type DocumentViewerProps = {
  title: string;
  fileUrl: string;
  onClose: () => void;
};

/**
 * Fullscreen in-app preview — PDF/image via same-origin inline proxy.
 */
export function DocumentViewer({ title, fileUrl, onClose }: DocumentViewerProps) {
  const kind = documentMediaKind(fileUrl);
  const src = inlineDocumentProxyUrl(fileUrl);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950/95"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-white">
            {title}
          </p>
          <p className="text-[0.72rem] text-white/55">Direktansicht</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <div className="relative min-h-0 flex-1 bg-neutral-900">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={title}
            className="h-full w-full object-contain"
          />
        ) : (
          <iframe
            title={title}
            src={src}
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
