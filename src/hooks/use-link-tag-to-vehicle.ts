"use client";

import { useCallback, useState, useTransition } from "react";

import { linkTagToVehicleAction } from "@/actions/link-tag-to-vehicle";

export function useLinkTagToVehicle(vehicleId: string) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const linkTag = useCallback(
    (tagUuid: string, onLinked?: (href: string) => void) => {
      startTransition(async () => {
        setError(null);
        const result = await linkTagToVehicleAction({ tagUuid, vehicleId });
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        onLinked?.(result.href);
      });
    },
    [vehicleId],
  );

  return { linkTag, error, pending };
}
