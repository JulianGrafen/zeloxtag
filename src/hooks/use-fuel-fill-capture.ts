"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { createOperatingCost } from "@/actions/operating-costs";
import {
  emptyFuelFillFormState,
  mapExtractionToFuelFillForm,
} from "@/lib/fuel-receipt/map-extraction-to-form";
import { normalizeFuelFillInput } from "@/lib/fuel-receipt/normalize-fuel-fill";
import { processFuelReceipt } from "@/lib/fuel-receipt/process-fuel-receipt";
import { FuelReceiptProcessError } from "@/lib/fuel-receipt/types";
import type { FuelFillFormState } from "@/lib/fuel-receipt/types";

export type FuelFillScanPhase = "idle" | "scanning" | "error";

type UseFuelFillCaptureOptions = {
  tagUuid: string;
  vehicleId: string;
  open: boolean;
  onSaved?: () => void;
};

export function useFuelFillCapture({
  tagUuid,
  vehicleId,
  open,
  onSaved,
}: UseFuelFillCaptureOptions) {
  const [form, setForm] = useState<FuelFillFormState>(emptyFuelFillFormState);
  const [scanPhase, setScanPhase] = useState<FuelFillScanPhase>("idle");
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = useCallback(() => {
    setForm(emptyFuelFillFormState());
    setScanPhase("idle");
    setScanError(null);
    setSubmitError(null);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const scanReceipt = useCallback(
    async (file: File) => {
      setScanPhase("scanning");
      setScanError(null);
      try {
        const extraction = await processFuelReceipt({
          file,
          vehicleId,
          tagUuid,
        });
        setForm((current) => mapExtractionToFuelFillForm(extraction, current));
        setScanPhase("idle");
      } catch (error) {
        setScanPhase("error");
        if (error instanceof FuelReceiptProcessError) {
          setScanError(error.message);
        } else if (error instanceof Error) {
          setScanError(error.message);
        } else {
          setScanError("Beleg konnte nicht analysiert werden.");
        }
      }
    },
    [tagUuid, vehicleId],
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
      onSaved?.();
    });
  }, [form, onSaved, tagUuid, vehicleId]);

  return {
    form,
    setForm,
    scanPhase,
    scanError,
    submitError,
    pending,
    scanReceipt,
    submit,
    reset,
    isScanning: scanPhase === "scanning",
  };
}
