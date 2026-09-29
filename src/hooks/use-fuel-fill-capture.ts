"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import { useFuelFillSubmit } from "@/hooks/use-fuel-fill-submit";
import {
  emptyFuelFillFormState,
  mapExtractionToFuelFillForm,
} from "@/lib/fuel-receipt/map-extraction-to-form";
import { processFuelReceipt } from "@/lib/fuel-receipt/process-fuel-receipt";
import { FuelReceiptProcessError } from "@/lib/fuel-receipt/types";
import type { FuelFillFormState } from "@/lib/fuel-receipt/types";
import { ingestImageFile } from "@/lib/ocr/processor";
import { DocumentCompressionError } from "@/lib/documents/document-compression";

export type FuelReceiptScanStep = "compose" | "extracting" | "review";

export type FuelScanProgress = {
  label: string;
  percent: number;
};

type UseFuelReceiptScanOptions = {
  tagUuid: string;
  vehicleId: string;
  backHref: string;
  canScan: boolean;
  scanSessionId: string | null;
  setScanSessionId: (sessionId: string | null) => void;
  onScanPaywall?: () => void;
  onScanQuotaConsumed?: () => void;
};

function compressionErrorMessage(error: unknown): string {
  if (error instanceof DocumentCompressionError) {
    return error.message;
  }
  if (error instanceof FuelReceiptProcessError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Verarbeitung fehlgeschlagen.";
}

export function useFuelReceiptScan({
  tagUuid,
  vehicleId,
  backHref,
  canScan,
  scanSessionId,
  setScanSessionId,
  onScanPaywall,
  onScanQuotaConsumed,
}: UseFuelReceiptScanOptions) {
  const { compressFile, isCompressing } = useDocumentCompression();
  const {
    submit: submitFill,
    submitError,
    pending,
    setSubmitError,
  } = useFuelFillSubmit({ tagUuid, vehicleId, backHref });

  const [step, setStep] = useState<FuelReceiptScanStep>("compose");
  const [form, setForm] = useState<FuelFillFormState>(emptyFuelFillFormState);
  const [progress, setProgress] = useState<FuelScanProgress>({
    label: "Vorbereitung…",
    percent: 0,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const resetWizard = useCallback(() => {
    revokePreview();
    setForm(emptyFuelFillFormState());
    setStep("compose");
    setProgress({ label: "Vorbereitung…", percent: 0 });
    setError(null);
    setSubmitError(null);
  }, [revokePreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const completeCapture = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) {
        setError("Bitte ein Foto der Tankquittung wählen.");
        return;
      }

      if (!canScan) {
        onScanPaywall?.();
        return;
      }

      setError(null);
      setStep("extracting");
      setProgress({ label: "Vorbereitung…", percent: 8 });

      try {
        const compressed = await compressFile(file);
        setProgress({ label: "Seite zuschneiden…", percent: 32 });

        const page = await ingestImageFile(compressed.file);
        revokePreview();
        previewUrlRef.current = page.previewUrl;
        setPreviewUrl(page.previewUrl);

        setProgress({ label: "Beleg analysieren…", percent: 58 });
        const ocrFile = new File(
          [page.blob],
          page.sourceName || "tankbeleg.jpg",
          {
            type: "image/jpeg",
            lastModified: Date.now(),
          },
        );

        const result = await processFuelReceipt({
          file: ocrFile,
          vehicleId,
          tagUuid,
          scanSessionId,
        });

        if (result.scanSessionId) {
          setScanSessionId(result.scanSessionId);
        }
        if (result.freeScanSessionStarted) {
          onScanQuotaConsumed?.();
        }

        setProgress({ label: "Fertig", percent: 100 });
        setForm((current) =>
          mapExtractionToFuelFillForm(result.extraction, current),
        );
        setStep("review");
      } catch (captureError) {
        setStep("compose");
        if (
          captureError instanceof FuelReceiptProcessError &&
          (captureError.code === "FREE_SCAN_EXHAUSTED" ||
            captureError.code === "SUBSCRIPTION_REQUIRED")
        ) {
          onScanPaywall?.();
          return;
        }
        setError(compressionErrorMessage(captureError));
      }
    },
    [
      canScan,
      compressFile,
      onScanPaywall,
      onScanQuotaConsumed,
      revokePreview,
      scanSessionId,
      setScanSessionId,
      tagUuid,
      vehicleId,
    ],
  );

  const submit = useCallback(() => {
    submitFill(form);
  }, [form, submitFill]);

  return {
    step,
    form,
    setForm,
    progress,
    previewUrl,
    error,
    submitError,
    pending,
    isCompressing,
    completeCapture,
    submit,
    resetWizard,
  };
}
