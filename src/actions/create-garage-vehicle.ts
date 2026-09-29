"use server";

import { headers } from "next/headers";

import { createGarageVehicleForOwner } from "@/lib/hardware/create-garage-vehicle";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import { garageDashboardTourHref } from "@/lib/onboarding/dashboard-tour";
import { setPendingDashboardTour } from "@/lib/onboarding/pending-dashboard-tour";

export type CreateGarageVehicleResult =
  | { status: "error"; message: string }
  | { status: "created"; href: string; vehicleId: string };

export async function createGarageVehicleAction(input: {
  make: string;
  model: string;
  year: string;
  vin?: string;
}): Promise<CreateGarageVehicleResult> {
  const headerStore = await headers();
  const clientKey = authClientKeyFromHeaders(headerStore);
  const cfg = RATE_LIMITS.auth;
  const limited = await rateLimit({
    key: `garage:create:${clientKey}`,
    limit: cfg.limit,
    windowMs: cfg.windowMs,
  });
  if (!limited.ok) {
    return {
      status: "error",
      message: `Zu viele Versuche. Bitte in ${limited.retryAfterSec}s erneut versuchen.`,
    };
  }

  const year = Number.parseInt(input.year, 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return {
      status: "error",
      message: "Baujahr muss zwischen 1900 und 2100 liegen.",
    };
  }

  const result = await createGarageVehicleForOwner({
    make: input.make,
    model: input.model,
    year,
    vin: input.vin,
  });

  if (result.status === "error") {
    return result;
  }

  await setPendingDashboardTour();

  return {
    status: "created",
    vehicleId: result.vehicleId,
    href: garageDashboardTourHref(result.vehicleId, true),
  };
}
