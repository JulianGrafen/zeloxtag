"use client";

import { useCallback, useState } from "react";

import {
  compressDocumentFile,
  compressDocumentFiles,
  DocumentCompressionError,
  type DocumentCompressionResult,
} from "@/lib/documents/document-compression";

export type UseDocumentCompressionResult = {
  /** Optimize one file (image compress / PDF size gate). */
  compressFile: (file: File) => Promise<DocumentCompressionResult>;
  /** Optimize many files sequentially. */
  compressFiles: (files: File[]) => Promise<DocumentCompressionResult[]>;
  /** True while compression runs (Web Worker keeps the main thread responsive). */
  isCompressing: boolean;
  /** Subtle status for the UI, e.g. "Optimiere Dateien…". */
  statusLabel: string | null;
  error: string | null;
  clearError: () => void;
};

function toUserMessage(compressError: unknown): string {
  if (compressError instanceof DocumentCompressionError) {
    return compressError.message;
  }
  if (compressError instanceof Error) {
    return compressError.message;
  }
  return "Optimierung fehlgeschlagen.";
}

/**
 * Client-side compression for invoice / ABE uploads.
 * Images → Full HD / ~1.5 MB JPEG via Web Worker.
 * PDFs → max 10 MB pass-through.
 */
export function useDocumentCompression(): UseDocumentCompressionResult {
  const [isCompressing, setIsCompressing] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const compressFile = useCallback(async (file: File) => {
    setError(null);
    setIsCompressing(true);
    setStatusLabel("Optimiere Dateien…");

    try {
      return await compressDocumentFile(file);
    } catch (compressError) {
      setError(toUserMessage(compressError));
      throw compressError;
    } finally {
      setStatusLabel(null);
      setIsCompressing(false);
    }
  }, []);

  const compressFiles = useCallback(async (files: File[]) => {
    setError(null);
    setIsCompressing(true);
    setStatusLabel(
      files.length > 1
        ? `Optimiere Dateien… (0/${files.length})`
        : "Optimiere Dateien…",
    );

    try {
      return await compressDocumentFiles(files, (index, total) => {
        setStatusLabel(`Optimiere Dateien… (${index}/${total})`);
      });
    } catch (compressError) {
      setError(toUserMessage(compressError));
      throw compressError;
    } finally {
      setStatusLabel(null);
      setIsCompressing(false);
    }
  }, []);

  return {
    compressFile,
    compressFiles,
    isCompressing,
    statusLabel,
    error,
    clearError,
  };
}
