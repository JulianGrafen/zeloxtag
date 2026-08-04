"use client";

import { useRef, useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";

import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import type { DocumentCompressionResult } from "@/lib/documents/document-compression";

export type DocumentUploadProps = {
  /** Called with optimized file(s) ready for OCR / FormData. */
  onReady: (results: DocumentCompressionResult[]) => void | Promise<void>;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
};

/**
 * Dropzone / file picker that compresses images (and size-gates PDFs)
 * before handing files to the parent upload / OCR flow.
 */
export function DocumentUpload({
  onReady,
  accept = "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif",
  multiple = false,
  disabled = false,
  label = "Datei wählen",
  hint = "Bilder werden automatisch für OCR optimiert",
  className = "",
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { compressFiles, isCompressing, statusLabel, error, clearError } =
    useDocumentCompression();
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    clearError();
    setLocalError(null);
    if (!fileList?.length) return;

    const files = Array.from(fileList);
    try {
      const results = await compressFiles(files);
      await onReady(results);
    } catch (compressError) {
      setLocalError(
        compressError instanceof Error
          ? compressError.message
          : "Optimierung fehlgeschlagen.",
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = disabled || isCompressing;
  const displayError = localError ?? error;

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <div className="relative">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={busy}
          className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(event) => {
            void handleFiles(event.target.files);
          }}
        />
        <div
          className={[
            "flex items-center gap-3 rounded-xl border border-dashed border-[color:var(--vd-border)] bg-white px-3 py-3.5",
            busy ? "opacity-70" : "",
          ].join(" ")}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
            {isCompressing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileUp className="h-4 w-4" aria-hidden />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.9rem] font-medium text-[color:var(--vd-text)]">
              {isCompressing ? (statusLabel ?? "Optimiere Dateien…") : label}
            </span>
            <span className="block text-[0.75rem] text-[color:var(--vd-muted)]">
              {hint}
            </span>
          </span>
        </div>
      </div>

      {displayError ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
        >
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
