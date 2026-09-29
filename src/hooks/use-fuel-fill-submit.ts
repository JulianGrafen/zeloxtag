"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { createOperatingCost } from "@/actions/operating-costs";
import { normalizeFuelFillInput } from "@/lib/fuel-receipt/normalize-fuel-fill";
import type { FuelFillFormState } from "@/lib/fuel-receipt/types";

type UseFuelFillSubmitOptions = {
  tagUuid: string;
  vehicleId: string;
  backHref: string;
};

export function useFuelFillSubmit({
  tagUuid,
  vehicleId,
  backHref,
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
    },
    [backHref, router, tagUuid, vehicleId],
  );

  return { submit, submitError, pending, setSubmitError };
}
