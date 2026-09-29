"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import {
  createOperatingCost,
  updateOperatingCost,
} from "@/actions/operating-costs";
import { normalizeFuelFillInput } from "@/lib/fuel-receipt/normalize-fuel-fill";
import type { FuelFillFormState } from "@/lib/fuel-receipt/types";

type UseFuelFillSubmitOptions = {
  tagUuid: string;
  vehicleId: string;
  backHref: string;
  entryId?: string;
};

export function useFuelFillSubmit({
  tagUuid,
  vehicleId,
  backHref,
  entryId,
}: UseFuelFillSubmitOptions) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = useCallback(
    (form: FuelFillFormState) => {
      setSubmitError(null);
      const normalized = normalizeFuelFillInput(form);
      if (!normalized.ok) {
        setSubmitError(normalized.message);
        return;
      }

      startTransition(async () => {
        const payload = {
          category: "fuel" as const,
          billingPeriod: "once" as const,
          amountEur: form.amountEur,
          occurredOn: form.occurredOn,
          fuelLiters: form.fuelLiters,
          odometerKm: form.odometerKm,
          note: form.note,
        };

        const result = entryId
          ? await updateOperatingCost({
              tagUuid,
              vehicleId,
              entryId,
              form: payload,
            })
          : await createOperatingCost({
              tagUuid,
              vehicleId,
              form: payload,
            });
        if (result.status === "error") {
          setSubmitError(result.message);
          return;
        }

        const separator = backHref.includes("?") ? "&" : "?";
        router.push(`${backHref}${separator}saved=1`);
        router.refresh();
      });
    },
    [backHref, entryId, router, tagUuid, vehicleId],
  );

  return { submit, submitError, pending, setSubmitError };
}
