"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { createOperatingCost } from "@/actions/operating-costs";
import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import {
  emptyFuelFillFormState,
  mapExtractionToFuelFillForm,
} from "@/lib/fuel-receipt/map-extraction-to-form";
import { normalizeFuelFillInput } from "@/lib/fuel-receipt/normalize-fuel-fill";
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
}: UseFuelReceiptScanOptions) {
  const router = useRouter();
  const { compressFile, isCompressing } = useDocumentCompression();

  const [step, setStep] = useState<FuelReceiptScanStep>("compose");
  const [form, setForm] = useState<FuelFillFormState>(emptyFuelFillFormState);
  const [progress, setProgress] = useState<FuelScanProgress>({
    label: "Vorbereitung…",
    percent: 0,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
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

        const extraction = await processFuelReceipt({
          file: ocrFile,
          vehicleId,
          tagUuid,
        });

        setProgress({ label: "Fertig", percent: 100 });
        setForm((current) => mapExtractionToFuelFillForm(extraction, current));
        setStep("review");
      } catch (captureError) {
        setStep("compose");
        setError(compressionErrorMessage(captureError));
      }
    },
    [compressFile, revokePreview, tagUuid, vehicleId],
  );

  const submit = useCallback(() => {
    setSubmitError(null);
    const normalized = normalizeFuelFillInput(form);
    if (!normalized.ok) {
      setSubmitError(normalized.message);
      return;
    }

    startTransition(async () => {
      const result = await createOperatingCost({
        tagUuid,
        vehicleId,
        form: {
          category: "fuel",
          billingPeriod: "once",
          amountEur: form.amountEur,
          occurredOn: form.occurredOn,
          fuelLiters: form.fuelLiters,
          odometerKm: form.odometerKm,
          note: form.note,
        },
      });
      if (result.status === "error") {
        setSubmitError(result.message);
        return;
      }

      const separator = backHref.includes("?") ? "&" : "?";
      router.push(`${backHref}${separator}saved=1`);
      router.refresh();
    });
  }, [backHref, form, router, tagUuid, vehicleId]);

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
